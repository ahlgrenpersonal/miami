const STATE_URL = "../state.json";
const ROUTING_GRAPH_URL = "routing_graph.json";
const ROUTING_GRAPH_MANIFEST_URL = "routing_graph/manifest.json";
const CROSSING_CONTROLS_URL = "routing_graph/crossing-controls.json?v=1";
const HOME_PLACE_ID = "place_id_panorama_tower";
const OFFLINE_TILE_VERSION = "177";
const WALK_SPEED_KMH = 6;
const KID_SCOOTER_SPEED_KMH = 14;
const KID_SCOOTER_BREAK_INTERVAL_MINUTES = 30;
const KID_SCOOTER_FIRST_BREAK_MINUTES = 3;
const KID_SCOOTER_LATER_BREAK_MINUTES = 5;
// Miami-Dade field observations found roughly 14-47 seconds of pedestrian delay at signalized
// crossings as signal timing varied; 20 seconds is a practical central estimate for this map.
// FHWA's broader review found about 1.4 seconds at unsignalized crossings, rounded here to two
// seconds for the normal look-and-yield pause. OSM control tags distinguish the two offline.
// Sources:
// https://highways.dot.gov/safety/pedestrian-bicyclist/safety-countermeasures/miami-dade-pedestrian-safety-project-phase-ii-5
// https://www.fhwa.dot.gov/publications/research/safety/pedbike/98107/section3.cfm
// https://wiki.openstreetmap.org/wiki/Tag:crossing%3Dtraffic_signals
const SIGNALIZED_CROSSING_DELAY_MINUTES = 20 / 60;
const OTHER_TRAFFIC_CROSSING_DELAY_MINUTES = 2 / 60;
// Model a weekend pedestrian encounter with the movable Brickell Avenue span as a fixed
// three-minute expected wait. Combining weekend on-demand operation, a roughly 10-16 minute
// full closure, and observed opening/blockage frequency gives a practical 2-4 minute expected-
// delay band; three minutes is its midpoint. A Miami River Commission study measured 3.5-4
// minutes just to raise the span, while recent FL511-derived weekend observations found both
// more openings and materially more blocked time than weekdays. Revalidate against:
// https://www.law.cornell.edu/cfr/text/33/117.305
// https://www.miamirivercommission.org/PDF/Agenda%2007.15.2024/Brickell%20Bridge%20Action%20Items/2022-12-06%20Hyatt%20Pedestrian%20Bridge%20Traffic%20Statement%20SS.pdf
// https://www.reddit.com/r/isBridgeUp/comments/1t7djuf/week_3_update_from_the_solo_dev_behind_isbridgeup/
// https://www.reddit.com/r/isBridgeUp/comments/1ty4cy2/week_7_update_from_the_solo_dev_behind_isbridgeup/
const BRICKELL_DRAWBRIDGE_WAIT_MINUTES = 3;
// These are the two roadway and two sidewalk center-span edges in the bundled unsimplified
// OSM graph. Using gate edges charges one wait per crossing without penalizing the Riverwalk
// underneath. Graph traversal is bidirectional, so each stored edge covers both directions.
const BRICKELL_DRAWBRIDGE_GATE_EDGES = new Set([
  "osm:9173470943|osm:9173470946",
  "osm:9173470945|osm:9173470944",
  "osm:9173470948|osm:9173470947",
  "osm:9173470949|osm:9173470950",
]);
const DEFAULT_HOME_ZOOM = 15;
const DEFAULT_MAX_SNAP_DISTANCE_METERS = 500;
const ROUTE_SNAP_CANDIDATE_LIMIT = 32;
const DIRECT_ENDPOINT_TRANSIT_CONNECTOR_MAX_METERS = 10;
const METROMOVER_SPEED_KMH = 14.5;
// Weekend outer-loop service is every 5 minutes, so random arrival averages a 2.5-minute wait.
// Source: https://www.miamidade.gov/transit/googletransit/current/google_transit.zip
const METROMOVER_WAIT_MINUTES = 2.5;
// Weekday daytime boats are hourly; a planned arrival 10-20 minutes early is modeled as 15 minutes.
// The same official schedule gives a consistent 20-minute crossing.
// Source: https://www.miamibeachfl.gov/city-hall/transportation/water-taxi/
const WATER_TAXI_WAIT_MINUTES = 15;
const WATER_TAXI_CROSSING_MINUTES = 20;
// Weekend Brickell service is roughly every 20 minutes, so random arrival averages about 10 minutes.
// Source: https://www.miamidade.gov/transit/googletransit/current/google_transit.zip
const BRICKELL_TROLLEY_WAIT_MINUTES = 10;
const BRICKELL_TROLLEY_RIDE_MINUTES = 35;
// Miami Beach publishes approximately 20-minute South Beach service, giving a 10-minute average wait.
// Source: https://www.miamibeachfl.gov/city-hall/transportation/trolley/south-beach-trolley/
const SOUTH_BEACH_TROLLEY_WAIT_MINUTES = 10;
// Weekend Biscayne and Little Havana service is every 15 minutes, so random arrival averages 7.5 minutes.
// Source: https://www.miamidade.gov/transit/googletransit/current/google_transit.zip
const BISCAYNE_TROLLEY_WAIT_MINUTES = 7.5;
const LITTLE_HAVANA_TROLLEY_WAIT_MINUTES = 7.5;
// School drop-offs are timed around a known Coral Way departure, so allow a five-minute buffer at Brickell.
// Return trips use the average wait from the official 20-minute weekday headway near La Prima Casa.
// Source: https://www.miamidade.gov/transit/googletransit/current/google_transit.zip
const CORAL_WAY_TROLLEY_TO_SCHOOL_WAIT_MINUTES = 5;
const CORAL_WAY_TROLLEY_TO_HOME_WAIT_MINUTES = 10;
// Route 26 runs every 30 minutes during the weekend daytime window used by this app,
// so an untimed arrival has a 15-minute average wait. Segment ride times below are
// medians from Saturday/Sunday 10:00-16:00 GTFS trips on the actual stop pairs.
// Sources:
// https://www.miamidade.gov/transit/googletransit/current/google_transit.zip
// https://www.miamidade.gov/resources/transportation_publicworks/documents/routes/26.pdf
const METROBUS_26_WAIT_MINUTES = 15;
// Transport mode may favor a more comfortable transit journey when its total time remains competitive.
const TRANSPORT_PREFERENCE_MAX_TIME_RATIO = 1.2;
const SOUTH_BEACH_TROLLEY_DOCK_NODE_ID = "transit:south_beach_trolley:water_taxi";
const SOUTH_BEACH_TROLLEY_MIDPOINT_ID = "place_id_south_beach_trolley_alton_10th";
const SOUTH_BEACH_TROLLEY_SOFI_ID = "place_id_south_beach_trolley_south_pointe";
const WATER_TAXI_STOP_IDS = [
  "place_id_miami_beach_water_taxi_downtown_miami",
  "place_id_water_taxi_mia_miami_beach",
];
const BRICKELL_TROLLEY_STOP_IDS = [
  "place_id_brickell_trolley_city_hall",
  "place_id_brickell_trolley_panorama_stop",
];
const BRICKELL_TROLLEY_ROUTE_COORDINATES = [
  [25.7278427, -80.2345222],
  [25.7302728, -80.2358311],
  [25.7319948, -80.2338463],
  [25.7341352, -80.2310568],
  [25.7356533, -80.2289218],
  [25.7369944, -80.2270442],
  [25.7378420, -80.2253920],
  [25.7386735, -80.2237934],
  [25.7391563, -80.2228492],
  [25.7407603, -80.2199095],
  [25.7430777, -80.2164656],
  [25.7414201, -80.2133328],
  [25.7438287, -80.2153713],
  [25.7458457, -80.2124423],
  [25.7469186, -80.2109510],
  [25.7477769, -80.2096742],
  [25.7495043, -80.2071959],
  [25.7509741, -80.2027112],
  [25.7517305, -80.2016491],
  [25.7527497, -80.2001041],
  [25.7538280, -80.1986021],
  [25.7555017, -80.1961881],
  [25.7574919, -80.1932913],
  [25.7589456, -80.1924545],
  [25.7620570, -80.1916498],
];
const SOUTH_BEACH_TROLLEY_ROUTE_COORDINATES = [
  [25.7933281, -80.1450799],
  [25.795444, -80.143459],
  [25.794545, -80.141492],
  [25.791873, -80.14138],
  [25.790141, -80.141337],
  [25.787533, -80.141254],
  [25.785364, -80.141187],
  [25.783694, -80.141125],
  [25.780669, -80.141042],
  [25.778334, -80.140961],
  [25.775676, -80.139725],
  [25.773302, -80.140205],
  [25.770618, -80.138406],
  [25.768169, -80.135921],
];
const BRICKELL_STATION_TROLLEYS_ID = "place_id_brickell_station_trolleys";
const DOMINO_PARK_TROLLEY_ID = "place_id_domino_park_calle_ocho_trolley";
const BISCAYNE_TROLLEY_PANORAMA_ID = "transit:biscayne:panorama";
// Route MIABIS stop IDs 11614/11613 sit across Midtown Boulevard from Trader Joe's.
// The 11+2 and 3+13 minute splits below preserve the official scheduled travel time.
// Source: https://www.miamidade.gov/transit/googletransit/current/google_transit.zip
const BISCAYNE_TROLLEY_TRADER_JOES_NORTHBOUND_ID = "transit:biscayne:trader-joes-northbound";
const BISCAYNE_TROLLEY_TRADER_JOES_SOUTHBOUND_ID = "transit:biscayne:trader-joes-southbound";
const BISCAYNE_TROLLEY_VIRTUAL_STOPS = [
  { id: "transit:biscayne:brickell-terminal", name: "Biscayne Trolley - Brickell Station", coordinates: [25.763335, -80.19532] },
  { id: BISCAYNE_TROLLEY_PANORAMA_ID, name: "Biscayne Trolley - Panorama Tower", coordinates: [25.7620570063591, -80.19164979457855] },
  { id: "transit:biscayne:bayside-northbound", name: "Biscayne Trolley - Bayside", coordinates: [25.776525, -80.187488] },
  { id: "transit:biscayne:edgewater-northbound", name: "Biscayne Trolley - Edgewater", coordinates: [25.79383, -80.18888] },
  { id: BISCAYNE_TROLLEY_TRADER_JOES_NORTHBOUND_ID, name: "Biscayne Trolley - Midtown Blvd & NE 32nd St", coordinates: [25.806597, -80.193089] },
  { id: "transit:biscayne:midtown-northbound", name: "Biscayne Trolley - Midtown", coordinates: [25.80974, -80.192358] },
  { id: "transit:biscayne:design-district", name: "Biscayne Trolley - Design District", coordinates: [25.811188, -80.19119] },
  { id: "transit:biscayne:midtown-southbound", name: "Biscayne Trolley - Midtown", coordinates: [25.809102, -80.19538] },
  { id: BISCAYNE_TROLLEY_TRADER_JOES_SOUTHBOUND_ID, name: "Biscayne Trolley - Midtown Blvd & NE 32nd St", coordinates: [25.807017, -80.193136] },
  { id: "transit:biscayne:edgewater-southbound", name: "Biscayne Trolley - Edgewater", coordinates: [25.791889, -80.187249] },
  { id: "transit:biscayne:bayside-southbound", name: "Biscayne Trolley - Bayside", coordinates: [25.777444, -80.188432] },
];
const BISCAYNE_TROLLEY_LINKS = [
  {
    fromId: "transit:biscayne:brickell-terminal",
    toId: BISCAYNE_TROLLEY_PANORAMA_ID,
    minutes: 8,
    coordinates: [[25.763335, -80.19532], [25.76148, -80.19401], [25.758948, -80.192459], [25.7620570063591, -80.19164979457855]],
  },
  {
    fromId: BISCAYNE_TROLLEY_PANORAMA_ID,
    toId: "transit:biscayne:bayside-northbound",
    minutes: 11,
    coordinates: [[25.7620570063591, -80.19164979457855], [25.763855, -80.191151], [25.767802, -80.190079], [25.77415, -80.18707], [25.776525, -80.187488]],
  },
  {
    fromId: "transit:biscayne:bayside-northbound",
    toId: "transit:biscayne:edgewater-northbound",
    minutes: 11,
    coordinates: [[25.776525, -80.187488], [25.78075, -80.18914], [25.78742, -80.18906], [25.79383, -80.18888]],
  },
  {
    fromId: "transit:biscayne:edgewater-northbound",
    toId: BISCAYNE_TROLLEY_TRADER_JOES_NORTHBOUND_ID,
    minutes: 11,
    coordinates: [[25.79383, -80.18888], [25.7973, -80.18895], [25.80115, -80.18906], [25.804175, -80.1916], [25.806597, -80.193089]],
  },
  {
    fromId: BISCAYNE_TROLLEY_TRADER_JOES_NORTHBOUND_ID,
    toId: "transit:biscayne:midtown-northbound",
    minutes: 2,
    coordinates: [[25.806597, -80.193089], [25.808119, -80.192733], [25.80974, -80.192358]],
  },
  {
    fromId: "transit:biscayne:midtown-northbound",
    toId: "transit:biscayne:design-district",
    minutes: 2,
    coordinates: [[25.80974, -80.192358], [25.811188, -80.19119]],
  },
  {
    fromId: "transit:biscayne:design-district",
    toId: "transit:biscayne:midtown-southbound",
    minutes: 5,
    coordinates: [[25.811188, -80.19119], [25.81061, -80.19285], [25.809102, -80.19538]],
  },
  {
    fromId: "transit:biscayne:midtown-southbound",
    toId: BISCAYNE_TROLLEY_TRADER_JOES_SOUTHBOUND_ID,
    minutes: 3,
    coordinates: [[25.809102, -80.19538], [25.808167, -80.193984], [25.807017, -80.193136]],
  },
  {
    fromId: BISCAYNE_TROLLEY_TRADER_JOES_SOUTHBOUND_ID,
    toId: "transit:biscayne:edgewater-southbound",
    minutes: 13,
    coordinates: [[25.807017, -80.193136], [25.804266, -80.193787], [25.803996, -80.189448], [25.79791, -80.189157], [25.793892, -80.189095], [25.791889, -80.187249]],
  },
  {
    fromId: "transit:biscayne:edgewater-southbound",
    toId: "transit:biscayne:bayside-southbound",
    minutes: 11,
    coordinates: [[25.791889, -80.187249], [25.78966, -80.188499], [25.78451, -80.189612], [25.779876, -80.189216], [25.777444, -80.188432]],
  },
  {
    fromId: "transit:biscayne:bayside-southbound",
    toId: "transit:biscayne:brickell-terminal",
    minutes: 14,
    coordinates: [[25.777444, -80.188432], [25.774652, -80.187871], [25.772674, -80.189257], [25.770908, -80.190191], [25.767255, -80.190986], [25.767466, -80.19297], [25.763335, -80.19532]],
  },
];
const LITTLE_HAVANA_TROLLEY_VIRTUAL_STOPS = [
  { id: "transit:little-havana:west-terminal", name: "Little Havana Trolley - West Terminal", coordinates: [25.774508, -80.256102] },
];
const LITTLE_HAVANA_TROLLEY_LINKS = [
  {
    fromId: BRICKELL_STATION_TROLLEYS_ID,
    toId: "transit:little-havana:west-terminal",
    minutes: 45,
    coordinates: [[25.76478, -80.195571], [25.766013, -80.197284], [25.7673, -80.19775], [25.769196, -80.200082], [25.771762, -80.200865], [25.774085, -80.202027], [25.77387, -80.20596], [25.7737, -80.21166], [25.773421, -80.21952], [25.7728, -80.22509], [25.77249, -80.236933], [25.772217, -80.246245], [25.771944, -80.254354], [25.772737, -80.255382], [25.774508, -80.256102]],
  },
  {
    fromId: "transit:little-havana:west-terminal",
    toId: DOMINO_PARK_TROLLEY_ID,
    minutes: 16,
    coordinates: [[25.774508, -80.256102], [25.771256, -80.255537], [25.764606, -80.254464], [25.764837, -80.24713], [25.76507, -80.23937], [25.76532, -80.23094], [25.765492, -80.224329], [25.76563, -80.2193]],
  },
  {
    fromId: DOMINO_PARK_TROLLEY_ID,
    toId: BRICKELL_STATION_TROLLEYS_ID,
    minutes: 10,
    coordinates: [[25.76563, -80.2193], [25.76579, -80.2141], [25.76587, -80.20907], [25.765982, -80.205446], [25.76619, -80.19788], [25.763555, -80.197398], [25.76478, -80.195571]],
  },
];
const CORAL_WAY_TROLLEY_VISIBLE_STOP_ID = "place_id_coral_way_trolley_prima_casa";
const CORAL_WAY_TROLLEY_BRICKELL_NODE_ID = "transit:coral-way:brickell-station";
const CORAL_WAY_TROLLEY_SCHOOL_WESTBOUND_NODE_ID = "transit:coral-way:prima-casa-westbound";
const CORAL_WAY_TROLLEY_SCHOOL_EASTBOUND_NODE_ID = "transit:coral-way:prima-casa-eastbound";
const CORAL_WAY_TROLLEY_VIRTUAL_STOPS = [
  { id: CORAL_WAY_TROLLEY_BRICKELL_NODE_ID, name: "Coral Way Trolley - Brickell Station", coordinates: [25.76478, -80.195571] },
  { id: CORAL_WAY_TROLLEY_SCHOOL_WESTBOUND_NODE_ID, name: "Coral Way Trolley - SW 27th Road", coordinates: [25.754624, -80.209531] },
  { id: CORAL_WAY_TROLLEY_SCHOOL_EASTBOUND_NODE_ID, name: "Coral Way Trolley - SW 28th Road", coordinates: [25.754234, -80.209651] },
];
const CORAL_WAY_TROLLEY_LINKS = [
  {
    fromId: CORAL_WAY_TROLLEY_BRICKELL_NODE_ID,
    toId: CORAL_WAY_TROLLEY_SCHOOL_WESTBOUND_NODE_ID,
    minutes: 8.533,
    coordinates: [
      [25.76478, -80.195571],
      [25.765200, -80.195656],
      [25.765373, -80.195671],
      [25.765324, -80.197380],
      [25.764362, -80.197342],
      [25.763401, -80.197311],
      [25.762440, -80.197273],
      [25.761477, -80.197243],
      [25.761464, -80.197705],
      [25.761446, -80.198334],
      [25.761419, -80.198628],
      [25.761436, -80.198964],
      [25.761447, -80.199103],
      [25.761442, -80.199238],
      [25.761470, -80.199444],
      [25.761435, -80.199542],
      [25.761398, -80.199635],
      [25.761310, -80.199824],
      [25.760652, -80.200762],
      [25.760082, -80.201572],
      [25.759368, -80.202601],
      [25.758368, -80.204047],
      [25.757276, -80.205631],
      [25.756627, -80.206554],
      [25.756057, -80.207394],
      [25.755427, -80.208284],
      [25.754831, -80.209147],
      [25.754624, -80.209531],
    ],
  },
  {
    fromId: CORAL_WAY_TROLLEY_SCHOOL_EASTBOUND_NODE_ID,
    toId: CORAL_WAY_TROLLEY_BRICKELL_NODE_ID,
    minutes: 8.433,
    coordinates: [
      [25.754234, -80.209651],
      [25.754671, -80.208998],
      [25.755339, -80.208064],
      [25.755973, -80.207154],
      [25.756535, -80.206334],
      [25.757104, -80.205498],
      [25.757628, -80.204691],
      [25.758778, -80.203077],
      [25.759916, -80.201433],
      [25.761041, -80.199827],
      [25.761266, -80.199449],
      [25.761442, -80.199238],
      [25.761174, -80.198555],
      [25.760593, -80.197559],
      [25.760423, -80.197232],
      [25.761477, -80.197243],
      [25.763401, -80.197311],
      [25.763414, -80.196798],
      [25.763440, -80.195731],
      [25.763504, -80.195595],
      [25.764124, -80.195619],
      [25.764637, -80.195647],
      [25.76478, -80.195571],
    ],
  },
];
// Google Maps routes this stop-to-school walk via the marked crossing at SW 26th Road (0.2 mile).
// Source: https://www.google.com/maps/dir/?api=1&origin=25.754624%2C-80.209531&destination=La+Prima+Casa+Montessori+-+Roads+Campus%2C+2733+SW+3rd+Ave%2C+Miami%2C+FL+33129&travelmode=walking
const CORAL_WAY_SCHOOL_SAFE_ACCESS_DISTANCE_METERS = 322;
const CORAL_WAY_SCHOOL_SAFE_ACCESS_MINUTES = 4;
const CORAL_WAY_SCHOOL_COORDINATES = [25.7541839, -80.2094603];
const CORAL_WAY_SCHOOL_SAFE_ACCESS_COORDINATES = [
  [25.754624, -80.209531],
  [25.754914, -80.2092739],
  [25.7551476, -80.2094664],
  [25.7558721, -80.2099925],
  [25.7559141, -80.2100322],
  [25.7559602, -80.2099622],
  [25.7551758, -80.2094248],
  [25.7548534, -80.2092821],
  [25.7541839, -80.2094603],
];
const METROBUS_26_PANORAMA_SOUTHBOUND_ID = "place_id_metrobus_26_panorama";
const METROBUS_26_HOBIE_SOUTHBOUND_ID = "place_id_metrobus_26_hobie_beach";
const METROBUS_26_CRANDON_SOUTHBOUND_ID = "place_id_metrobus_26_crandon_beach";
const METROBUS_26_CRANDON_NORTHBOUND_ID = "transit:metrobus26:crandon-northbound";
const METROBUS_26_HOBIE_NORTHBOUND_ID = "transit:metrobus26:hobie-northbound";
const METROBUS_26_PANORAMA_NORTHBOUND_ID = "transit:metrobus26:panorama-northbound";
const METROBUS_26_VISIBLE_STOP_IDS = [
  METROBUS_26_PANORAMA_SOUTHBOUND_ID,
  METROBUS_26_HOBIE_SOUTHBOUND_ID,
  METROBUS_26_CRANDON_SOUTHBOUND_ID,
];
const METROBUS_26_VIRTUAL_STOPS = [
  { id: METROBUS_26_CRANDON_NORTHBOUND_ID, name: "Metrobus 26 - Crandon Blvd northbound", coordinates: [25.708925, -80.156664] },
  { id: METROBUS_26_HOBIE_NORTHBOUND_ID, name: "Metrobus 26 - Hobie Island northbound", coordinates: [25.744529, -80.174292] },
  { id: METROBUS_26_PANORAMA_NORTHBOUND_ID, name: "Metrobus 26 - SW 13th St & Brickell Ave", coordinates: [25.761725, -80.192519] },
];
const METROBUS_26_LINKS = [
  {
    fromId: METROBUS_26_PANORAMA_SOUTHBOUND_ID,
    toId: METROBUS_26_HOBIE_SOUTHBOUND_ID,
    minutes: 14,
    coordinates: [[25.761173,-80.192184],[25.761145,-80.192090],[25.758206,-80.192865],[25.757955,-80.192999],[25.751998,-80.201572],[25.750608,-80.203705],[25.750418,-80.204100],[25.748188,-80.202262],[25.747381,-80.201309],[25.746887,-80.200486],[25.746138,-80.198654],[25.745922,-80.197495],[25.745863,-80.196213],[25.745913,-80.194210],[25.746259,-80.191061],[25.746299,-80.184007],[25.746483,-80.178495],[25.746408,-80.177770],[25.746196,-80.177003],[25.745787,-80.176183],[25.745796,-80.176324]],
  },
  {
    fromId: METROBUS_26_HOBIE_SOUTHBOUND_ID,
    toId: METROBUS_26_CRANDON_SOUTHBOUND_ID,
    minutes: 11,
    coordinates: [[25.745796,-80.176324],[25.745787,-80.176183],[25.745489,-80.175758],[25.743709,-80.173698],[25.733363,-80.162206],[25.732659,-80.161397],[25.732618,-80.161255],[25.728026,-80.156096],[25.727911,-80.156069],[25.727370,-80.155525],[25.724586,-80.152402],[25.723907,-80.151845],[25.723131,-80.151405],[25.721992,-80.151046],[25.720981,-80.150962],[25.720108,-80.151080],[25.719434,-80.151310],[25.717337,-80.152459],[25.711645,-80.155914],[25.708298,-80.157733],[25.708376,-80.157757]],
  },
  {
    fromId: METROBUS_26_CRANDON_NORTHBOUND_ID,
    toId: METROBUS_26_HOBIE_NORTHBOUND_ID,
    minutes: 9.5,
    coordinates: [[25.708925,-80.156664],[25.708351,-80.157082],[25.719808,-80.150810],[25.720713,-80.150566],[25.721429,-80.150520],[25.722203,-80.150604],[25.723243,-80.150978],[25.723713,-80.151260],[25.724466,-80.151902],[25.727182,-80.154950],[25.728321,-80.156453],[25.732001,-80.160575],[25.733987,-80.162585],[25.744606,-80.174459],[25.744529,-80.174292]],
  },
  {
    fromId: METROBUS_26_HOBIE_NORTHBOUND_ID,
    toId: METROBUS_26_PANORAMA_NORTHBOUND_ID,
    minutes: 10,
    coordinates: [[25.744529,-80.174292],[25.745625,-80.175625],[25.745984,-80.176180],[25.746363,-80.177035],[25.746553,-80.177931],[25.746614,-80.179028],[25.746410,-80.183621],[25.746373,-80.190474],[25.746111,-80.194014],[25.746088,-80.197128],[25.746256,-80.198220],[25.746677,-80.199514],[25.747224,-80.200542],[25.747887,-80.201431],[25.750040,-80.203569],[25.750452,-80.203615],[25.757844,-80.192833],[25.758488,-80.192598],[25.761681,-80.191795],[25.761644,-80.192337],[25.761725,-80.192519]],
  },
];const NOISE_OVERLAY_MIN_SCORE = 0.25;
const NOISE_OVERLAY_MAX_EDGES = 9000;
const RADAR_WMS_URL = "https://opengeo.ncep.noaa.gov/geoserver/conus/conus_bref_qcd/ows";
const RADAR_LAYER_NAME = "conus_bref_qcd";
const WEATHER_BASE_TILE_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" preserveAspectRatio="none">
  <defs>
    <linearGradient id="wash" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#b8e9f4" stop-opacity="0.66"/>
      <stop offset="0.45" stop-color="#f4fbfc" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#88c6dc" stop-opacity="0.58"/>
    </linearGradient>
    <radialGradient id="puff" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.88"/>
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.36"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="256" height="256" fill="url(#wash)"/>
  <g fill="#ffffff" fill-opacity="0.16">
    <path d="M-20 32 C 32 8, 66 38, 108 26 S 170 10, 222 34 S 280 38, 286 16 L286 -8 L-20 -8 Z"/>
    <path d="M-24 130 C 28 96, 78 148, 130 122 S 194 94, 278 136 L278 168 L-24 170 Z"/>
    <path d="M-20 238 C 34 204, 78 246, 128 224 S 196 204, 278 236 L278 268 L-20 268 Z"/>
  </g>
  <g fill="url(#puff)">
    <ellipse cx="48" cy="54" rx="44" ry="18"/>
    <ellipse cx="132" cy="84" rx="66" ry="22"/>
    <ellipse cx="214" cy="58" rx="52" ry="18"/>
    <ellipse cx="80" cy="164" rx="56" ry="20"/>
    <ellipse cx="188" cy="178" rx="72" ry="22"/>
    <ellipse cx="34" cy="230" rx="48" ry="18"/>
  </g>
  <g fill="none" stroke-linecap="round">
    <g stroke="#2f9db3" stroke-opacity="0.35" stroke-width="4">
      <path d="M-24 72 C 32 38, 96 100, 156 68 S 224 44, 280 74"/>
      <path d="M-18 152 C 42 112, 96 174, 158 142 S 226 126, 282 158"/>
      <path d="M-14 222 C 42 190, 94 240, 156 212 S 226 190, 280 220"/>
    </g>
    <g stroke="#ffffff" stroke-opacity="0.45" stroke-width="2">
      <path d="M18 72 C 68 52, 110 86, 156 70"/>
      <path d="M32 152 C 76 132, 118 166, 162 144"/>
      <path d="M20 222 C 70 202, 112 230, 158 214"/>
    </g>
  </g>
</svg>`;
const WEATHER_REFRESH_MS = 15 * 60 * 1000;
const METROMOVER_STATION_LINKS = [
  ["place_id_metromover_financial_district_station", "place_id_metromover_tenth_street_promenade_station"],
  ["place_id_metromover_tenth_street_promenade_station", "place_id_metromover_brickell_city_centre_eight_street_station"],
  ["place_id_metromover_brickell_city_centre_eight_street_station", "place_id_metromover_5th_st_station"],
  ["place_id_metromover_5th_st_station", "place_id_metromover_riverwalk_station"],
  ["place_id_metromover_riverwalk_station", "place_id_metromover_miami_avenue_station"],
  ["place_id_metromover_miami_avenue_station", "place_id_metromover_government_center_station"],
  ["place_id_metromover_government_center_station", "place_id_metromover_college_bayside_station"],
  ["place_id_metromover_college_bayside_station", "place_id_metromover_museum_park_station"],
  ["place_id_metromover_museum_park_station", "place_id_adrienne_arsht_metromover_station"],
  ["place_id_metromover_riverwalk_station", "place_id_metromover_bayfront_park_station"],
  ["place_id_metromover_bayfront_park_station", "place_id_metromover_college_bayside_station"],
];
const OFFLINE_TILE_BOUNDS = [[25.660, -80.275], [25.835, -80.100]];
const QA_CANVAS_CAPTURE_DELAY_MS = 1200;
const ROUTING_PROFILES = {
  shortest: {
    label: "Shortest",
    speedKmh: WALK_SPEED_KMH,
    scoreWeights: {},
    minMultiplier: 1,
    maxMultiplier: 1,
    hardPenalties: {},
    fixedPenaltiesM: {},
  },
  scenic: {
    label: "Scenic",
    speedKmh: WALK_SPEED_KMH,
    scoreWeights: { waterside: 0.25, waterfront: 0.3, park_path: 0.45, car_free: 0.1, scenic: 0.18, kid_scooter: 0.02, traffic_stress: -0.18, noise: -0.85 },
    minMultiplier: 0.35,
    maxMultiplier: 2.6,
    hardPenalties: {},
    fixedPenaltiesM: { traffic_crossing: 24, roadside_baywalk: 4 },
  },
  kid_scooter: {
    label: "Kid scooter",
    speedKmh: KID_SCOOTER_SPEED_KMH,
    scoreWeights: { kid_scooter: 0.78, scooter: 0.22, waterfront: 0.03, traffic_stress: -0.26 },
    minMultiplier: 0.35,
    maxMultiplier: 3,
    hardPenalties: { "highway=steps": 1.18 },
    fixedPenaltiesM: { traffic_crossing: 42 },
  },
  metromover: {
    label: "Transport",
    speedKmh: WALK_SPEED_KMH,
    scoreWeights: {},
    minMultiplier: 1,
    maxMultiplier: 1,
    hardPenalties: {},
    fixedPenaltiesM: {},
  },
};
const TAG_FILTERS = [
  { tag: "food", label: "Food" },
  { tag: "dessert", label: "Dessert" },
  { tag: "supermarket", label: "Supermarket" },
  { tag: "schools", label: "Schools" },
  { tag: "playgrounds", label: "Playgrounds" },
  { tag: "parks", label: "Parks" },
  { tag: "transport", label: "Transport" },
  { tag: "indoors", label: "Indoors" },
];
const FOOD_FILTER_TAGS = new Set([
  "american_restaurant",
  "asian_restaurant",
  "bakery",
  "dessert",
  "food",
  "grill",
  "ice_cream",
  "mediterranean_restaurant",
  "mexican_restaurant",
  "pizza_restaurant",
  "restaurant",
  "sushi_restaurant",
  "upscale_restaurant_bar",
]);
const DESSERT_FILTER_TAGS = new Set(["bakery", "dessert", "ice_cream"]);
const SUPERMARKET_FILTER_TAGS = new Set(["supermarket"]);
const SCHOOL_FILTER_TAGS = new Set(["academy", "elementary_school", "montessori_school", "preschool", "school"]);
const PLAYGROUND_FILTER_TAGS = new Set(["playground"]);
const PARK_FILTER_TAGS = new Set(["beach_park", "dog_park", "nature_preserve", "park"]);
const TRANSPORT_FILTER_TAGS = new Set(["metromover", "water_taxi", "brickell_trolley", "south_beach_trolley", "biscayne_trolley", "little_havana_trolley", "coral_way_trolley", "metrobus_26", "transit", "transportation"]);
const INDOOR_FILTER_TAGS = new Set(["childrens_museum", "indoors", "science_museum"]);

const app = {
  state: null,
  places: [],
  markers: new Map(),
  selectedId: null,
  activeTags: new Set(),
  search: "",
  placesPanelCollapsed: true,
  routeFromId: null,
  routeToId: null,
  routeAnchorMode: null,
  travelMode: "shortest",
  routingGraph: null,
  routingGraphPromise: null,
  routingGraphStatus: "idle",
  routeAdjacency: null,
  routeNodes: [],
  signalizedCrossingNodeIds: new Set(),
  noiseOverlayEnabled: false,
  noiseOverlayEdges: null,
  noiseOverlayLayer: null,
  weatherOverlayEnabled: false,
  weatherBackdropLayer: null,
  radarLayer: null,
  weatherRefreshTimer: null,
  weatherForecastSlots: [],
  weatherForecastError: "",
  weatherPanelOpen: false,
  routeRequestId: 0,
};

window.spinApp = app;

const dom = {};

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindDom();
  renderTagFilters();
  bindEvents();
  await loadState();
  initMap();
  renderAll();
  scheduleRoutingGraphPreload();
  refreshWeather();
  scheduleCanvasQaCapture();
  registerServiceWorker();
}

function bindDom() {
  dom.map = document.querySelector("#map");
  dom.weatherPill = document.querySelector("#weather-pill");
  dom.weatherPanel = document.querySelector("#weather-panel");
  dom.weatherForecast = document.querySelector("#weather-forecast");
  dom.placeCount = document.querySelector("#place-count");
  dom.visibleCount = document.querySelector("#visible-count");
  dom.searchInput = document.querySelector("#search-input");
  dom.placesPanel = document.querySelector("#places-panel");
  dom.placesBrandToggle = document.querySelector("#places-brand-toggle");
  dom.tagFilters = document.querySelector("#tag-filters");
  dom.noiseFilter = document.querySelector("#noise-filter");
  dom.weatherLayerFilter = document.querySelector("#weather-layer-filter");
  dom.placeList = document.querySelector("#place-list");
  dom.resetFilters = document.querySelector("#reset-filters");
  dom.detailSheet = document.querySelector("#detail-sheet");
  dom.closeDetail = document.querySelector("#close-detail");
  dom.detailTitleLink = document.querySelector("#detail-title-link");
  dom.routeHome = document.querySelector("#route-home");
  dom.routeLocation = document.querySelector("#route-location");
  dom.routeMetromover = document.querySelector("#route-metromover");
  dom.modeShortest = document.querySelector("#mode-shortest");
  dom.modeScenic = document.querySelector("#mode-scenic");
  dom.modeScooter = document.querySelector("#mode-scooter");
  dom.routeStatus = document.querySelector("#route-status");
  dom.clearRoute = document.querySelector("#clear-route");
}

function bindEvents() {
  dom.weatherPill.addEventListener("click", (event) => {
    event.stopPropagation();
    setWeatherPanelOpen(!app.weatherPanelOpen);
  });

  document.addEventListener("click", (event) => {
    if (!app.weatherPanelOpen) return;
    if (dom.weatherPanel.contains(event.target) || dom.weatherPill.contains(event.target)) return;
    setWeatherPanelOpen(false);
  });

  dom.searchInput.addEventListener("input", () => {
    app.search = normalizeSearchText(dom.searchInput.value);
    renderAll();
    focusSearchMatch();
  });

  dom.noiseFilter.addEventListener("change", () => {
    setNoiseOverlayEnabled(dom.noiseFilter.checked);
  });

  dom.weatherLayerFilter.addEventListener("change", () => {
    setWeatherOverlayEnabled(dom.weatherLayerFilter.checked);
  });

  dom.placesBrandToggle.addEventListener("click", (event) => {
    event.stopPropagation();
    togglePlacesPanel();
  });

  dom.placesBrandToggle.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    togglePlacesPanel();
  });

  dom.resetFilters.addEventListener("click", () => {
    app.activeTags.clear();
    app.search = "";
    app.selectedId = null;
    dom.searchInput.value = "";
    for (const button of dom.tagFilters.querySelectorAll(".chip")) {
      button.classList.remove("is-active");
      button.setAttribute("aria-pressed", "false");
    }
    dom.detailSheet.classList.remove("is-open");
    renderAll();
  });

  dom.closeDetail.addEventListener("click", () => {
    app.selectedId = null;
    dom.detailSheet.classList.remove("is-open");
    renderMarkers();
    renderList();
  });

  dom.routeLocation.addEventListener("click", () => {
    if (!app.selectedId) return;
    app.routeFromId = app.selectedId;
    app.routeToId = null;
    app.routeAnchorMode = "location";
    renderRoute();
  });

  dom.routeHome.addEventListener("click", () => {
    if (!app.selectedId) return;
    app.routeFromId = HOME_PLACE_ID;
    app.routeToId = app.selectedId;
    app.routeAnchorMode = "home";
    renderRoute();
  });

  dom.routeMetromover.addEventListener("click", () => {
    if (!app.selectedId) return;
    app.travelMode = "metromover";
    if (app.routeFromId && !app.routeToId && app.routeFromId !== app.selectedId) {
      app.routeToId = app.selectedId;
    } else if (!hasActiveRoute() || (app.selectedId !== app.routeFromId && app.selectedId !== app.routeToId)) {
      app.routeFromId = HOME_PLACE_ID;
      app.routeToId = app.selectedId;
      app.routeAnchorMode = "home";
    }
    syncTravelModeButtons();
    renderRoute();
  });

  dom.modeShortest.addEventListener("click", () => setTravelMode("shortest"));
  dom.modeScenic.addEventListener("click", () => setTravelMode("scenic"));
  dom.modeScooter.addEventListener("click", () => setTravelMode("kid_scooter"));

  dom.clearRoute.addEventListener("click", () => {
    clearRouteState();
  });
}

async function refreshWeather() {
  if (!dom.weatherPill || !dom.weatherPanel || !app.state?.user_profile?.home_base) return;
  window.clearTimeout(app.weatherRefreshTimer);
  try {
    const [lat, lon] = app.state.user_profile.home_base;
    const weather = await fetchWeatherSummary(lat, lon);
    dom.weatherPill.textContent = `${Math.round(weather.temperatureC)}°C · RH ${Math.round(weather.humidityPct)}% · Rain ${Math.round(weather.rainPct)}%`;
    dom.weatherPill.title = "Weather near Panorama Tower";
    dom.weatherPill.classList.remove("is-muted");
    app.weatherForecastSlots = weather.slots;
    app.weatherForecastError = "";
    renderWeatherForecast();
  } catch (error) {
    dom.weatherPill.textContent = "Weather unavailable";
    dom.weatherPill.title = "Weather unavailable";
    dom.weatherPill.classList.add("is-muted");
    app.weatherForecastSlots = [];
    app.weatherForecastError = "Weather unavailable";
    renderWeatherForecast("Weather unavailable");
  } finally {
    app.weatherRefreshTimer = window.setTimeout(refreshWeather, WEATHER_REFRESH_MS);
  }
}

async function fetchWeatherSummary(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat.toFixed(5),
    longitude: lon.toFixed(5),
    current: "temperature_2m,relative_humidity_2m",
    hourly: "temperature_2m,relative_humidity_2m,precipitation_probability",
    temperature_unit: "celsius",
    forecast_days: "2",
    timezone: "auto",
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, { cache: "no-store" });
  if (!response.ok) throw new Error(`Weather request failed: ${response.status}`);
  const data = await response.json();
  const temperatureC = Number(data.current?.temperature_2m);
  const humidityPct = Number(data.current?.relative_humidity_2m);
  const rainPct = getSecondHighestForecastValue(data.hourly, "precipitation_probability", new Date(), 6);
  const slots = getDaytimeWeatherSlots(data.hourly, new Date());
  if (!Number.isFinite(temperatureC) || !Number.isFinite(humidityPct) || !Number.isFinite(rainPct)) {
    throw new Error("Weather response missing expected values");
  }
  return { temperatureC, humidityPct, rainPct, slots };
}

function getSecondHighestForecastValue(hourly, field, now, hours) {
  const times = hourly?.time || [];
  const values = [];
  for (let index = 0; index < times.length; index += 1) {
    const time = parseWeatherTime(times[index]);
    if (!time || time < now) continue;
    const hoursAhead = (time - now) / (60 * 60 * 1000);
    if (hoursAhead >= hours) continue;
    values.push(Number(hourly?.[field]?.[index]));
  }
  const sortedValues = values.map(Number).filter(Number.isFinite).sort((left, right) => right - left);
  return sortedValues[1] ?? sortedValues[0] ?? NaN;
}

function getDaytimeWeatherSlots(hourly, now) {
  const times = hourly?.time || [];
  const slots = [];
  for (let index = 0; index < times.length; index += 1) {
    const time = parseWeatherTime(times[index]);
    if (!time || time < now) continue;
    const hour = time.getHours();
    if (hour < 8 || hour > 19) continue;
    slots.push({
      time,
      dateKey: getWeatherDateKey(time),
      hour,
      temperatureC: Number(hourly?.temperature_2m?.[index]),
      humidityPct: Number(hourly?.relative_humidity_2m?.[index]),
      rainPct: Number(hourly?.precipitation_probability?.[index]),
    });
  }
  return slots.filter((slot) => (
    Number.isFinite(slot.temperatureC)
    && Number.isFinite(slot.humidityPct)
    && Number.isFinite(slot.rainPct)
  ));
}

function parseWeatherTime(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getWeatherDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function renderWeatherForecast(message = "") {
  if (!dom.weatherForecast) return;
  if (!message && app.weatherForecastError) message = app.weatherForecastError;
  if (message) {
    dom.weatherForecast.innerHTML = `<p class="weather-empty">${message}</p>`;
    return;
  }
  if (!app.weatherForecastSlots.length) {
    dom.weatherForecast.innerHTML = '<p class="weather-empty">Forecast unavailable.</p>';
    return;
  }
  const todayKey = getWeatherDateKey(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowKey = getWeatherDateKey(tomorrow);
  const groups = [
    { key: todayKey, label: "Today" },
    { key: tomorrowKey, label: "Tomorrow" },
  ].map((group) => ({
    ...group,
    slots: app.weatherForecastSlots.filter((slot) => slot.dateKey === group.key),
  }));

  const content = groups.map((group) => `
    <section class="weather-day">
      <h3>${group.label}</h3>
      ${group.slots.length ? group.slots.map((slot) => `
        <div class="weather-slot">
          <span>${formatWeatherHour(slot.hour)}</span>
          <span>${Math.round(slot.temperatureC)}°C</span>
          <span>H ${Math.round(slot.humidityPct)}%</span>
          <span>Rain ${Math.round(slot.rainPct)}%</span>
        </div>
      `).join("") : '<p class="weather-empty">No remaining 8-19 slots.</p>'}
    </section>
  `).join("");
  dom.weatherForecast.innerHTML = content || '<p class="weather-empty">Forecast unavailable.</p>';
}

function formatWeatherHour(hour) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function setWeatherPanelOpen(isOpen) {
  app.weatherPanelOpen = isOpen;
  dom.weatherPanel.hidden = !isOpen;
  dom.weatherPill.setAttribute("aria-expanded", String(isOpen));
  if (isOpen) renderWeatherForecast();
}

function setPlacesPanelCollapsed(isCollapsed) {
  if (!isCollapsed) setWeatherPanelOpen(false);
  app.placesPanelCollapsed = isCollapsed;
  dom.placesPanel.classList.toggle("is-collapsed", isCollapsed);
  dom.placesBrandToggle.setAttribute("aria-label", isCollapsed ? "Expand places" : "Collapse places");
  dom.placesBrandToggle.setAttribute("aria-expanded", String(!isCollapsed));
  window.setTimeout(() => app.map?.invalidateSize(), 120);
}

function togglePlacesPanel() {
  setPlacesPanelCollapsed(!app.placesPanelCollapsed);
}

function closeRouteTool() {
  app.selectedId = null;
  dom.detailSheet.classList.remove("is-open");
  app.map?.closePopup();
  clearRouteState();
  renderMarkers();
  renderList();
}

function clearRouteState() {
  app.routeFromId = null;
  app.routeToId = null;
  app.routeAnchorMode = null;
  renderRoute();
}

function setNoiseOverlayEnabled(isEnabled) {
  app.noiseOverlayEnabled = isEnabled;
  dom.noiseFilter.checked = isEnabled;
  if (!app.map) return;
  ensureNoiseOverlayLayer();
  if (isEnabled) {
    app.noiseOverlayLayer.addTo(app.map);
    ensureRoutingGraph().then(() => {
      if (app.noiseOverlayEnabled) app.noiseOverlayLayer.redraw();
    });
  } else if (app.noiseOverlayLayer) {
    app.noiseOverlayLayer.remove();
  }
}

function setWeatherOverlayEnabled(isEnabled) {
  app.weatherOverlayEnabled = isEnabled;
  dom.weatherLayerFilter.checked = isEnabled;
  if (!app.map) return;
  ensureWeatherOverlayLayer();
  if (isEnabled) {
    app.weatherBackdropLayer.addTo(app.map);
    app.radarLayer.addTo(app.map);
  } else {
    app.weatherBackdropLayer?.remove();
    app.radarLayer.remove();
  }
}

function ensureWeatherOverlayLayer() {
  if (app.radarLayer) return;
  const refreshToken = Math.floor(Date.now() / (5 * 60 * 1000));
  const weatherBaseUrl = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(WEATHER_BASE_TILE_SVG)}`;
  app.weatherBackdropLayer = L.tileLayer(weatherBaseUrl, {
    opacity: 0.52,
    interactive: false,
    zIndex: 235,
  });
  app.radarLayer = L.tileLayer.wms(RADAR_WMS_URL, {
    layers: RADAR_LAYER_NAME,
    format: "image/png",
    transparent: true,
    version: "1.1.1",
    opacity: 0.62,
    zIndex: 240,
    uppercase: true,
    _ts: refreshToken,
    attribution: "NOAA/NWS MRMS weather radar",
  });
}

function ensureNoiseOverlayLayer() {
  if (app.noiseOverlayLayer) return;
  const NoiseOverlayLayer = L.Layer.extend({
    onAdd(map) {
      this._map = map;
      this._canvas = L.DomUtil.create("canvas", "noise-overlay");
      this._context = this._canvas.getContext("2d");
      map.getPanes().overlayPane.appendChild(this._canvas);
      map.on("moveend zoomend resize", this.redraw, this);
      this.redraw();
    },
    onRemove(map) {
      map.off("moveend zoomend resize", this.redraw, this);
      this._canvas?.remove();
      this._canvas = null;
      this._context = null;
      this._map = null;
    },
    redraw() {
      if (!this._map || !this._canvas || !this._context) return;
      const size = this._map.getSize();
      const topLeft = this._map.containerPointToLayerPoint([0, 0]);
      L.DomUtil.setPosition(this._canvas, topLeft);
      if (this._canvas.width !== size.x) this._canvas.width = size.x;
      if (this._canvas.height !== size.y) this._canvas.height = size.y;
      this._context.clearRect(0, 0, size.x, size.y);
      if (app.routingGraphStatus !== "ready") return;
      drawNoiseOverlay(this._context, this._map);
    },
  });
  app.noiseOverlayLayer = new NoiseOverlayLayer();
}

function drawNoiseOverlay(context, map) {
  const edges = getNoiseOverlayEdges();
  if (!edges.length) return;
  const bounds = map.getBounds().pad(0.08);
  const zoom = map.getZoom();
  const lineWidth = Math.max(2.2, Math.min(8, (zoom - 11) * 0.65));
  const visibleEdges = [];
  for (const edge of edges) {
    if (edge.south > bounds.getNorth()
      || edge.north < bounds.getSouth()
      || edge.west > bounds.getEast()
      || edge.east < bounds.getWest()) {
      continue;
    }
    visibleEdges.push(edge);
  }
  visibleEdges
    .sort((a, b) => a.noise - b.noise)
    .slice(-NOISE_OVERLAY_MAX_EDGES)
    .forEach((edge) => {
      const from = map.latLngToContainerPoint(edge.from);
      const to = map.latLngToContainerPoint(edge.to);
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.strokeStyle = getNoiseOverlayColor(edge.noise);
      context.globalAlpha = 0.34 + Math.min(0.38, edge.noise * 0.38);
      context.lineWidth = lineWidth + edge.noise * 3.2;
      context.lineCap = "round";
      context.stroke();
    });
  context.globalAlpha = 1;
}

function getNoiseOverlayEdges() {
  if (app.noiseOverlayEdges) return app.noiseOverlayEdges;
  if (!app.routingGraph?.edges || !app.routingGraph?.nodes) return [];
  const nodes = app.routingGraph.nodes;
  app.noiseOverlayEdges = app.routingGraph.edges
    .filter((edge) => (edge.noise || 0) >= NOISE_OVERLAY_MIN_SCORE)
    .map((edge) => {
      const fromNode = nodes[edge.from];
      const toNode = nodes[edge.to];
      if (!fromNode || !toNode) return null;
      const from = [fromNode.lat, fromNode.lon];
      const to = [toNode.lat, toNode.lon];
      return {
        from,
        to,
        noise: edge.noise || 0,
        south: Math.min(from[0], to[0]),
        north: Math.max(from[0], to[0]),
        west: Math.min(from[1], to[1]),
        east: Math.max(from[1], to[1]),
      };
    })
    .filter(Boolean);
  return app.noiseOverlayEdges;
}

function getNoiseOverlayColor(noise) {
  if (noise >= 0.82) return "#7a1fb3";
  if (noise >= 0.65) return "#d62f6c";
  if (noise >= 0.48) return "#e4572e";
  if (noise >= 0.34) return "#f18701";
  return "#f6c945";
}

function renderTagFilters() {
  dom.tagFilters.innerHTML = "";
  for (const filter of TAG_FILTERS) {
    const button = document.createElement("button");
    button.className = `chip chip-${filter.tag}`;
    button.type = "button";
    button.textContent = filter.label;
    button.dataset.tag = filter.tag;
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      if (app.activeTags.has(filter.tag)) {
        app.activeTags.delete(filter.tag);
      } else {
        app.activeTags.add(filter.tag);
      }
      button.classList.toggle("is-active", app.activeTags.has(filter.tag));
      button.setAttribute("aria-pressed", String(app.activeTags.has(filter.tag)));
      renderAll();
    });
    dom.tagFilters.appendChild(button);
  }
}

async function loadState() {
  const response = await fetch(STATE_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Unable to load ${STATE_URL}`);
  }
  app.state = await response.json();
  app.places = Object.entries(app.state.places).map(([id, place]) => {
    const normalizedPlace = { id, ...place };
    normalizedPlace.filterTags = getFilterTags(normalizedPlace);
    normalizedPlace.searchText = getSearchText(normalizedPlace);
    return normalizedPlace;
  });
}

async function loadRoutingGraph() {
  try {
    app.routingGraphStatus = "loading";
    const [routingGraph, crossingControls] = await Promise.all([
      fetchRoutingGraph(),
      fetchCrossingControls().catch((error) => {
        console.info("Crossing controls unavailable; treating marked crossings as unsignalized.", error);
        return { signalized_crossing_node_ids: [] };
      }),
    ]);
    app.routingGraph = routingGraph;
    app.signalizedCrossingNodeIds = new Set(crossingControls.signalized_crossing_node_ids || []);
    app.routeNodes = Object.entries(app.routingGraph.nodes || {}).map(([id, node]) => ({
      id,
      lat: node.lat,
      lon: node.lon,
      coordinates: [node.lat, node.lon],
    }));
    app.routeAdjacency = buildRouteAdjacency(app.routingGraph.edges || []);
    app.routingGraphStatus = "ready";
  } catch (error) {
    app.routingGraphStatus = "error";
    console.info("Local routing graph unavailable; direct route preview will be used.", error);
  }
}

function ensureRoutingGraph() {
  if (app.routingGraphStatus === "ready" || app.routingGraphStatus === "error") {
    return Promise.resolve();
  }
  if (!app.routingGraphPromise) {
    app.routingGraphPromise = loadRoutingGraph();
  }
  return app.routingGraphPromise;
}

function scheduleRoutingGraphPreload() {
  const preload = () => {
    ensureRoutingGraph().then(() => {
      if (app.routingGraphStatus === "error") {
        console.info("Local routing graph preload unavailable; direct route preview will be used until the graph loads.");
      }
    }).catch((error) => {
      console.info("Local routing graph preload failed unexpectedly.", error);
    });
  };
  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(preload, { timeout: 1200 });
  } else {
    window.setTimeout(preload, 250);
  }
}

async function fetchRoutingGraph() {
  const manifestResponse = await fetch(ROUTING_GRAPH_MANIFEST_URL, { cache: "no-store" });
  if (manifestResponse.ok) {
    return fetchChunkedRoutingGraph(await manifestResponse.json());
  }

  const response = await fetch(ROUTING_GRAPH_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Unable to load ${ROUTING_GRAPH_MANIFEST_URL} or ${ROUTING_GRAPH_URL}`);
  }
  return response.json();
}

async function fetchChunkedRoutingGraph(manifest) {
  const graph = {
    ...manifest,
    nodes: {},
    edges: [],
  };
  delete graph.chunks;

  const baseUrl = ROUTING_GRAPH_MANIFEST_URL.slice(0, ROUTING_GRAPH_MANIFEST_URL.lastIndexOf("/") + 1);
  for (const chunkPath of manifest.chunks?.nodes || []) {
    Object.assign(graph.nodes, await fetchRoutingGraphChunk(`${baseUrl}${chunkPath}`));
  }
  for (const chunkPath of manifest.chunks?.edges || []) {
    graph.edges.push(...await fetchRoutingGraphChunk(`${baseUrl}${chunkPath}`));
  }
  return graph;
}

async function fetchRoutingGraphChunk(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Unable to load ${url}`);
  }
  return response.json();
}

async function fetchCrossingControls() {
  const response = await fetch(CROSSING_CONTROLS_URL, { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to load ${CROSSING_CONTROLS_URL}`);
  return response.json();
}

function buildRouteAdjacency(edges) {
  const adjacency = new Map();
  for (const edge of edges) {
    addRouteEdge(adjacency, edge.from, edge.to, edge);
    addRouteEdge(adjacency, edge.to, edge.from, edge);
  }
  return adjacency;
}

function addRouteEdge(adjacency, fromId, toId, edge) {
  if (!adjacency.has(fromId)) adjacency.set(fromId, []);
  adjacency.get(fromId).push({ toId, edge });
}

function initMap() {
  const home = app.state.user_profile.home_base;
  const requestedView = getRequestedMapView();
  const initialCenter = requestedView.center || home;
  const initialZoom = requestedView.zoom || DEFAULT_HOME_ZOOM;
  app.map = L.map(dom.map, {
    zoomControl: false,
    preferCanvas: true,
    minZoom: 13,
    maxZoom: 19,
    maxBounds: OFFLINE_TILE_BOUNDS,
    maxBoundsViscosity: 0.75,
  }).setView(initialCenter, initialZoom);
  app.map.attributionControl.setPrefix(false);

  L.control.zoom({ position: "bottomright" }).addTo(app.map);

  L.tileLayer(`tiles/offline/{z}/{x}/{y}.svg?v=${OFFLINE_TILE_VERSION}`, {
    minZoom: 13,
    maxNativeZoom: 18,
    maxZoom: 19,
    bounds: OFFLINE_TILE_BOUNDS,
    noWrap: true,
    attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a>",
  }).addTo(app.map);

  app.selectedCircle = L.circle(home, {
    radius: 95,
    color: "#d95d39",
    weight: 4,
    fillColor: "#d95d39",
    fillOpacity: 0.16,
    opacity: 0,
    interactive: false,
  }).addTo(app.map);

  app.routeLine = L.polyline([], {
    color: "#d95d39",
    weight: 5,
    opacity: 0,
    dashArray: "8 8",
  }).addTo(app.map);
  app.routeSegmentLines = [];

  for (const place of app.places) {
    const marker = L.marker(place.coordinates, {
      icon: getMarkerIcon(place),
      title: place.name,
    }).addTo(app.map);
    marker.bindPopup(getPopupHtml(place), {
      closeButton: false,
      offset: [0, -10],
      className: "spin-popup",
    });
    marker.on("click", () => selectPlace(place.id));
    app.markers.set(place.id, marker);
  }
}

function scheduleCanvasQaCapture() {
  if (new URLSearchParams(window.location.search).get("qa-canvas") !== "1") return;
  writeCanvasQaReport({ status: "pending" });
  app.map.whenReady(() => {
    window.setTimeout(() => {
      captureVisibleMapTiles()
        .then((report) => {
          writeCanvasQaReport({ status: "ready", ...report });
        })
        .catch((error) => {
          writeCanvasQaReport({ status: "error", message: error.message });
        });
    }, QA_CANVAS_CAPTURE_DELAY_MS);
  });
}

function writeCanvasQaReport(report) {
  let target = document.querySelector("#qa-canvas-report");
  if (!target) {
    target = document.createElement("script");
    target.id = "qa-canvas-report";
    target.type = "application/json";
    target.hidden = true;
    document.body.appendChild(target);
  }
  document.documentElement.dataset.canvasQaStatus = report.status;
  target.textContent = JSON.stringify(report);
}

async function captureVisibleMapTiles() {
  const mapRect = dom.map.getBoundingClientRect();
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(mapRect.width);
  canvas.height = Math.round(mapRect.height);
  const context = canvas.getContext("2d");
  context.fillStyle = "#f1efe7";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const tileImages = [...dom.map.querySelectorAll("img.leaflet-tile")];
  await Promise.all(tileImages.map((image) => image.decode?.().catch(() => undefined)));

  const visibleTiles = [];
  const failedTiles = [];
  for (const image of tileImages) {
    const rect = image.getBoundingClientRect();
    const isVisible = rect.right > mapRect.left
      && rect.bottom > mapRect.top
      && rect.left < mapRect.right
      && rect.top < mapRect.bottom
      && rect.width > 0
      && rect.height > 0;
    if (!isVisible) continue;
    if (!image.complete || image.naturalWidth === 0) {
      failedTiles.push(image.currentSrc || image.src);
      continue;
    }
    context.drawImage(
      image,
      rect.left - mapRect.left,
      rect.top - mapRect.top,
      rect.width,
      rect.height,
    );
    visibleTiles.push(image.currentSrc || image.src);
  }

  const pixelSummary = summarizeCanvasPixels(context, canvas.width, canvas.height);
  return {
    mapSize: { width: canvas.width, height: canvas.height },
    visibleTileCount: visibleTiles.length,
    failedTileCount: failedTiles.length,
    failedTiles: failedTiles.slice(0, 6),
    tileVersionOk: visibleTiles.length > 0 && visibleTiles.every((src) => src.includes(`v=${OFFLINE_TILE_VERSION}`)),
    ...pixelSummary,
    pngDataUrl: canvas.toDataURL("image/png"),
  };
}

function summarizeCanvasPixels(context, width, height) {
  const pixels = context.getImageData(0, 0, width, height).data;
  const colors = new Set();
  let nonBackground = 0;
  let water = 0;
  let sampled = 0;
  const stepX = Math.max(1, Math.floor(width / 100));
  const stepY = Math.max(1, Math.floor(height / 100));
  for (let y = 0; y < height; y += stepY) {
    for (let x = 0; x < width; x += stepX) {
      const index = (y * width + x) * 4;
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      const key = `${red},${green},${blue}`;
      colors.add(key);
      sampled += 1;
      if (key !== "241,239,231") nonBackground += 1;
      if (key === "173,215,225") water += 1;
    }
  }
  return {
    sampledPixels: sampled,
    uniqueSampledColors: colors.size,
    nonBackgroundSampleRatio: sampled ? Number((nonBackground / sampled).toFixed(4)) : 0,
    waterSampleRatio: sampled ? Number((water / sampled).toFixed(4)) : 0,
  };
}

function getMarkerIcon(place) {
  const classes = ["spin-marker"];
  if (place.id === HOME_PLACE_ID) {
    classes.push("is-home");
  } else if (place.filterTags.includes("dessert")) {
    classes.push("is-dessert");
  } else if (place.filterTags.includes("supermarket")) {
    classes.push("is-supermarket");
  } else if (place.filterTags.includes("schools")) {
    classes.push("is-school");
  } else if (place.filterTags.includes("food")) {
    classes.push("is-food");
  } else if (place.filterTags.includes("playgrounds")) {
    classes.push("is-playground");
  } else if (place.filterTags.includes("transport")) {
    classes.push("is-transport");
  } else if (place.filterTags.includes("parks")) {
    classes.push("is-park");
  } else if (place.filterTags.includes("indoors")) {
    classes.push("is-indoors");
  }
  if (place.id === app.selectedId) {
    classes.push("is-selected");
  }
  return L.divIcon({
    className: "",
    html: `<span class="${classes.join(" ")}"></span>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

function renderAll() {
  renderMarkers();
  renderList();
  renderCounts();
}

function getVisiblePlaces() {
  return app.places.filter((place) => {
    const hasSearch = Boolean(app.search);
    if (!hasSearch && app.activeTags.size > 0 && ![...app.activeTags].every((tag) => place.filterTags.includes(tag))) return false;
    if (app.search && !place.searchText.includes(app.search)) return false;
    return true;
  }).sort((a, b) => {
    const distanceA = a.meta?.distance_from_home_m ?? 0;
    const distanceB = b.meta?.distance_from_home_m ?? 0;
    return distanceA - distanceB || a.name.localeCompare(b.name);
  });
}

function renderMarkers() {
  const visibleIds = new Set(getVisiblePlaces().map((place) => place.id));
  for (const place of app.places) {
    const marker = app.markers.get(place.id);
    if (!marker) continue;
    marker.setIcon(getMarkerIcon(place));
    marker.setZIndexOffset(place.id === app.selectedId ? 1000 : 0);
    if (visibleIds.has(place.id)) {
      if (!app.map.hasLayer(marker)) marker.addTo(app.map);
    } else if (app.map.hasLayer(marker)) {
      marker.remove();
    }
  }
  renderSelectedCircle();
}

function renderList() {
  const visible = getVisiblePlaces();
  dom.placeList.innerHTML = "";
  for (const place of visible.slice(0, 80)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "place-row";
    button.classList.toggle("is-selected", place.id === app.selectedId);
    button.innerHTML = `
      <strong>${escapeHtml(place.name)}</strong>
      <span>${getPlaceSubtitle(place)}</span>
    `;
    button.addEventListener("click", () => selectPlace(place.id, { source: "list" }));
    dom.placeList.appendChild(button);
  }
}

function renderCounts() {
  const visible = getVisiblePlaces().length;
  const filtersActive = getAreFiltersActive();
  dom.placeCount.textContent = `${app.places.length} places`;
  dom.visibleCount.textContent = filtersActive ? `${visible} filtered` : `${visible} visible`;
  dom.resetFilters.hidden = !filtersActive;
}

function getAreFiltersActive() {
  return Boolean(app.search || app.activeTags.size > 0);
}

function focusSearchMatch() {
  if (app.search.length < 3) return;
  const visible = getVisiblePlaces();
  if (!visible.length) return;

  const exactMatch = visible.find((place) => normalizeSearchText(place.name) === app.search);
  const startsWithMatch = visible.find((place) => normalizeSearchText(place.name).startsWith(app.search));
  if (visible.length === 1 || exactMatch || startsWithMatch) {
    const place = exactMatch || startsWithMatch || visible[0];
    selectPlace(place.id, { source: "search" });
  }
}

function hasActiveRoute() {
  return Boolean(app.routeFromId && app.routeToId);
}

function hasLocationRouteAnchor() {
  return app.routeAnchorMode === "location" && Boolean(app.routeFromId);
}

function hasHomeRouteAnchor() {
  return app.routeAnchorMode === "home" && app.routeFromId === HOME_PLACE_ID;
}

function selectPlace(id, options = {}) {
  if (options.source === "list") {
    setPlacesPanelCollapsed(true);
  }
  const wasSelected = app.selectedId === id;
  const shouldUpdateLocationRoute = hasLocationRouteAnchor() && id !== app.routeFromId;
  const shouldUpdateHomeRoute = hasHomeRouteAnchor() && id !== HOME_PLACE_ID;
  const shouldUpdateAnchoredRoute = shouldUpdateLocationRoute || shouldUpdateHomeRoute;
  if (shouldUpdateLocationRoute) {
    app.routeToId = id;
  } else if (shouldUpdateHomeRoute) {
    app.routeFromId = HOME_PLACE_ID;
    app.routeToId = id;
  }
  const preserveMapView = (hasActiveRoute() || shouldUpdateAnchoredRoute) && !options.forceMapMove;
  app.selectedId = id;
  const place = app.places.find((item) => item.id === id);
  if (!place) return;
  const marker = app.markers.get(id);
  if (marker) {
    if (!app.map.hasLayer(marker)) {
      marker.addTo(app.map);
    }
    marker.setIcon(getMarkerIcon(place));
    marker.setZIndexOffset(1000);
    if (!preserveMapView && wasSelected) {
      const targetZoom = Math.max(app.map.getZoom(), options.source === "search" ? 18 : 17);
      app.map.flyTo(marker.getLatLng(), targetZoom, { animate: true, duration: 0.55 });
    } else if (!preserveMapView) {
      app.map.panTo(marker.getLatLng(), { animate: true, duration: 0.35 });
    }
    if (!preserveMapView) {
      window.setTimeout(() => marker.openPopup(), 180);
    }
  }
  renderDetail(place);
  renderMarkers();
  renderList();
}

function renderSelectedCircle() {
  if (!app.selectedCircle) return;
  const selected = app.places.find((place) => place.id === app.selectedId);
  if (!selected) {
    app.selectedCircle.setStyle({ opacity: 0, fillOpacity: 0 });
    return;
  }
  app.selectedCircle.setLatLng(selected.coordinates);
  app.selectedCircle.setStyle({ opacity: 1, fillOpacity: 0.16 });
}

function renderDetail(place) {
  dom.detailTitleLink.textContent = place.name;
  dom.detailTitleLink.href = getGoogleMapsUrl(place);
  dom.detailTitleLink.title = `Open ${place.name} in Google Maps`;
  dom.detailTitleLink.setAttribute("aria-label", `Open ${place.name} in Google Maps`);
  dom.detailSheet.classList.add("is-open");
  renderRoute();
}

function setTravelMode(mode) {
  app.travelMode = mode;
  syncTravelModeButtons();
  renderRoute();
}

function syncTravelModeButtons() {
  dom.modeShortest.classList.toggle("is-active", app.travelMode === "shortest");
  dom.modeShortest.setAttribute("aria-pressed", String(app.travelMode === "shortest"));
  dom.modeScenic.classList.toggle("is-active", app.travelMode === "scenic");
  dom.modeScenic.setAttribute("aria-pressed", String(app.travelMode === "scenic"));
  dom.modeScooter.classList.toggle("is-active", app.travelMode === "kid_scooter");
  dom.modeScooter.setAttribute("aria-pressed", String(app.travelMode === "kid_scooter"));
  dom.routeMetromover.classList.toggle("is-active", app.travelMode === "metromover");
  dom.routeMetromover.setAttribute("aria-pressed", String(app.travelMode === "metromover"));
}

async function renderRoute() {
  const requestId = ++app.routeRequestId;
  const from = app.places.find((place) => place.id === app.routeFromId);
  const to = app.places.find((place) => place.id === app.routeToId);
  const modeLabel = getTravelModeLabel(app.travelMode);

  if (from && to && app.routeLine) {
    clearRouteGeometry();
    if (app.routingGraphStatus === "loading" || app.routingGraphStatus === "idle") {
      dom.routeStatus.textContent = `${modeLabel}: loading local graph...`;
      dom.clearRoute.hidden = false;
      ensureRoutingGraph().then(() => {
        if (requestId === app.routeRequestId) renderRoute();
      });
      return;
    }
    const route = getLocalRoute(from.coordinates, to.coordinates, app.travelMode);
    if (requestId !== app.routeRequestId) return;
    if (route) {
      renderRouteGeometry(route, app.travelMode);
      dom.routeStatus.textContent = formatRouteStatus(modeLabel, from, to, route, app.travelMode);
    } else {
      setRoutePreview([from.coordinates, to.coordinates], { opacity: 0.7 });
      dom.routeStatus.textContent = `${modeLabel}: direct preview only; local graph unavailable for this pair`;
    }
    dom.clearRoute.hidden = false;
  } else {
    clearRouteGeometry();
    const fromText = from ? `From ${from.name}` : "Choose a start";
    const toText = to ? `to ${to.name}` : "choose a destination";
    dom.routeStatus.textContent = `${modeLabel}: ${fromText}, ${toText}`;
    dom.clearRoute.hidden = !(from || to);
  }
}

function getLocalRoute(fromCoordinates, toCoordinates, mode) {
  if (mode === "metromover") return getMetromoverRoute(fromCoordinates, toCoordinates);
  return getGraphRoute(fromCoordinates, toCoordinates, mode);
}

function getGraphRoute(fromCoordinates, toCoordinates, mode) {
  if (!app.routingGraph || !app.routeAdjacency || app.routeNodes.length === 0) return null;
  const maxSnapDistanceM = app.routingGraph.max_snap_distance_m || DEFAULT_MAX_SNAP_DISTANCE_METERS;
  const startCandidates = findNearestRouteNodes(fromCoordinates, ROUTE_SNAP_CANDIDATE_LIMIT)
    .filter((node) => node.distanceM <= maxSnapDistanceM);
  const endCandidates = findNearestRouteNodes(toCoordinates, ROUTE_SNAP_CANDIDATE_LIMIT)
    .filter((node) => node.distanceM <= maxSnapDistanceM);
  if (!startCandidates.length || !endCandidates.length) return null;

  const routeResult = findShortestPathBetweenCandidates(startCandidates, endCandidates, mode);
  if (!routeResult?.nodeIds?.length) return null;

  const nodesById = app.routingGraph.nodes;
  const coordinates = [
    fromCoordinates,
    ...routeResult.nodeIds.map((id) => [nodesById[id].lat, nodesById[id].lon]),
    toCoordinates,
  ];
  const distanceM = getRouteDistance(coordinates);
  const bridgeWaitMinutes = routeResult.edges.reduce(
    (sum, edge) => sum + getBrickellDrawbridgeWaitMinutes(edge),
    0,
  );
  const crossingDelay = getPedestrianCrossingDelaySummary(routeResult.edges);
  return {
    coordinates,
    distanceM,
    durationMinutes: Math.max(1, Math.round(
      getTravelMinutes(distanceM, mode) + bridgeWaitMinutes + crossingDelay.totalMinutes,
    )),
    bridgeWaitMinutes,
    crossingDelayMinutes: crossingDelay.totalMinutes,
    signalizedCrossingCount: crossingDelay.signalizedCount,
    otherTrafficCrossingCount: crossingDelay.otherCount,
    startSnapM: routeResult.start.distanceM,
    endSnapM: routeResult.end.distanceM,
  };
}

function getMetromoverRoute(fromCoordinates, toCoordinates) {
  return getUnifiedMultimodalRoute(fromCoordinates, toCoordinates);
}

function getUnifiedMultimodalRoute(fromCoordinates, toCoordinates) {
  if (!app.routingGraph || !app.routeAdjacency || app.routeNodes.length === 0) return null;
  const context = createUnifiedMultimodalContext(fromCoordinates, toCoordinates);
  const result = findPreferredUnifiedMultimodalPath(context, context.originId, context.destinationId);
  if (!result?.edges?.length) return null;

  const segments = coalesceUnifiedMultimodalSegments(result.edges);
  const metromoverSegments = segments.filter((segment) => segment.type === "metromover");
  const waterTaxiSegments = segments.filter((segment) => segment.type === "water_taxi");
  const brickellTrolleySegments = segments.filter((segment) => segment.type === "brickell_trolley");
  const southBeachTrolleySegments = segments.filter((segment) => segment.type === "south_beach_trolley");
  const biscayneTrolleySegments = segments.filter((segment) => segment.type === "biscayne_trolley");
  const littleHavanaTrolleySegments = segments.filter((segment) => segment.type === "little_havana_trolley");
  const coralWayTrolleySegments = segments.filter((segment) => segment.type === "coral_way_trolley");
  const metrobus26Segments = segments.filter((segment) => segment.type === "metrobus_26");
  const metromoverUsed = metromoverSegments.length > 0;
  const waterTaxiUsed = waterTaxiSegments.length > 0;
  const brickellTrolleyUsed = brickellTrolleySegments.length > 0;
  const southBeachTrolleyUsed = southBeachTrolleySegments.length > 0;
  const biscayneTrolleyUsed = biscayneTrolleySegments.length > 0;
  const littleHavanaTrolleyUsed = littleHavanaTrolleySegments.length > 0;
  const coralWayTrolleyUsed = coralWayTrolleySegments.length > 0;
  const metrobus26Used = metrobus26Segments.length > 0;
  const crossingDelayEdges = result.edges.filter((edge) => edge.crossingDelayMinutes > 0);

  return {
    coordinates: mergeRouteCoordinates(...segments.map((segment) => segment.coordinates)),
    distanceM: segments.reduce((sum, segment) => sum + segment.distanceM, 0),
    durationMinutes: Math.max(1, Math.round(result.durationMinutes)),
    crossingDelayMinutes: crossingDelayEdges.reduce(
      (sum, edge) => sum + edge.crossingDelayMinutes,
      0,
    ),
    signalizedCrossingCount: crossingDelayEdges.filter(
      (edge) => edge.signalizedTrafficCrossing,
    ).length,
    otherTrafficCrossingCount: crossingDelayEdges.filter(
      (edge) => !edge.signalizedTrafficCrossing,
    ).length,
    metromoverUsed,
    waterTaxiUsed,
    brickellTrolleyUsed,
    southBeachTrolleyUsed,
    biscayneTrolleyUsed,
    littleHavanaTrolleyUsed,
    coralWayTrolleyUsed,
    metrobus26Used,
    combinedTransitUsed: metromoverUsed && waterTaxiUsed,
    transitUsed: metromoverUsed || waterTaxiUsed || brickellTrolleyUsed || southBeachTrolleyUsed || biscayneTrolleyUsed || littleHavanaTrolleyUsed || coralWayTrolleyUsed || metrobus26Used,
    transitStartName: segments.find((segment) => segment.type !== "walk")?.startName,
    transitEndName: [...segments].reverse().find((segment) => segment.type !== "walk")?.endName,
    metromoverStartName: metromoverSegments[0]?.startName,
    metromoverEndName: metromoverSegments[metromoverSegments.length - 1]?.endName,
    waterTaxiStartName: waterTaxiSegments[0]?.startName,
    waterTaxiEndName: waterTaxiSegments[waterTaxiSegments.length - 1]?.endName,
    brickellTrolleyStartName: brickellTrolleySegments[0]?.startName,
    brickellTrolleyEndName: brickellTrolleySegments[brickellTrolleySegments.length - 1]?.endName,
    southBeachTrolleyStartName: southBeachTrolleySegments[0]?.startName,
    southBeachTrolleyEndName: southBeachTrolleySegments[southBeachTrolleySegments.length - 1]?.endName,
    biscayneTrolleyStartName: biscayneTrolleySegments[0]?.startName,
    biscayneTrolleyEndName: biscayneTrolleySegments[biscayneTrolleySegments.length - 1]?.endName,
    littleHavanaTrolleyStartName: littleHavanaTrolleySegments[0]?.startName,
    littleHavanaTrolleyEndName: littleHavanaTrolleySegments[littleHavanaTrolleySegments.length - 1]?.endName,
    coralWayTrolleyStartName: coralWayTrolleySegments[0]?.startName,
    coralWayTrolleyEndName: coralWayTrolleySegments[coralWayTrolleySegments.length - 1]?.endName,
    metrobus26StartName: metrobus26Segments[0]?.startName,
    metrobus26EndName: metrobus26Segments[metrobus26Segments.length - 1]?.endName,
    segments,
    itinerary: createTransportItinerary(result.edges),
  };
}

function createUnifiedMultimodalContext(fromCoordinates, toCoordinates) {
  const context = {
    originId: "unified:origin",
    destinationId: "unified:destination",
    customAdjacency: new Map(),
    virtualNodes: new Map(),
  };
  addUnifiedVirtualNode(context, context.originId, "endpoint", "Origin", fromCoordinates);
  addUnifiedVirtualNode(context, context.destinationId, "endpoint", "Destination", toCoordinates);

  const transitNodes = [
    ...getMetromoverStations().map((place) => ({ id: place.id, type: "metromover", name: place.name, coordinates: place.coordinates })),
    ...getWaterTaxiStops().map((place) => ({ id: place.id, type: "water_taxi", name: place.name, coordinates: place.coordinates })),
    ...getBrickellTrolleyStops().map((place) => ({ id: place.id, type: "brickell_trolley", name: place.name, coordinates: place.coordinates })),
    ...getSouthBeachTrolleyStops().map((place) => ({ id: place.id, type: "south_beach_trolley", name: place.name, coordinates: place.coordinates })),
    ...getBiscayneTrolleyStops().map((place) => ({ id: place.id, type: "biscayne_trolley", name: place.name, coordinates: place.coordinates })),
    ...getLittleHavanaTrolleyStops().map((place) => ({ id: place.id, type: "little_havana_trolley", name: place.name, coordinates: place.coordinates })),
    ...getCoralWayTrolleyStops().map((place) => ({ id: place.id, type: "coral_way_trolley", name: place.name, coordinates: place.coordinates })),
    ...getMetrobus26Stops().map((place) => ({ id: place.id, type: "metrobus_26", name: place.name, coordinates: place.coordinates })),
  ];
  for (const node of transitNodes) {
    addUnifiedVirtualNode(context, node.id, node.type, node.name, node.coordinates);
  }

  addUnifiedEndpointConnectors(context, context.originId, "origin");
  addUnifiedEndpointConnectors(context, context.destinationId, "destination");
  for (const node of transitNodes) {
    addUnifiedTransitConnectors(context, node);
  }
  addUnifiedEndpointTransitConnectors(context, transitNodes);
  addUnifiedMetromoverRideEdges(context);
  addUnifiedWaterTaxiRideEdges(context);
  addUnifiedBrickellTrolleyRideEdges(context);
  addUnifiedSouthBeachTrolleyRideEdges(context);
  addUnifiedBiscayneTrolleyRideEdges(context);
  addUnifiedLittleHavanaTrolleyRideEdges(context);
  addUnifiedCoralWayTrolleyRideEdges(context);
  addUnifiedMetrobus26RideEdges(context);
  return context;
}

function addUnifiedVirtualNode(context, id, type, name, coordinates) {
  context.virtualNodes.set(id, { id, type, name, coordinates });
  if (!context.customAdjacency.has(id)) context.customAdjacency.set(id, []);
}

function addUnifiedCustomEdge(context, fromId, toId, edge) {
  if (!context.customAdjacency.has(fromId)) context.customAdjacency.set(fromId, []);
  context.customAdjacency.get(fromId).push({ toId, edge });
}

function addUnifiedEndpointConnectors(context, endpointId, endpointRole) {
  const endpoint = context.virtualNodes.get(endpointId);
  for (const candidate of getUnifiedConnectableRouteNodes(endpoint.coordinates)) {
    const routeCoordinates = getUnifiedRouteNodeCoordinates(candidate.id);
    if (!routeCoordinates) continue;
    const edge = createUnifiedMultimodalEdge("walk", endpointId, candidate.id, endpoint.coordinates, routeCoordinates, {
      distanceM: candidate.distanceM,
      durationMinutes: getExactTravelMinutes(candidate.distanceM, WALK_SPEED_KMH),
      startName: endpoint.name,
    });
    if (endpointRole === "origin") {
      addUnifiedCustomEdge(context, endpointId, candidate.id, edge);
    } else {
      addUnifiedCustomEdge(context, candidate.id, endpointId, {
        ...edge,
        coordinates: [routeCoordinates, endpoint.coordinates],
        startId: candidate.id,
        endId: endpointId,
        endName: endpoint.name,
      });
    }
  }
}

function addUnifiedTransitConnectors(context, transitNode) {
  for (const candidate of getUnifiedConnectableRouteNodes(transitNode.coordinates)) {
    const routeCoordinates = getUnifiedRouteNodeCoordinates(candidate.id);
    if (!routeCoordinates) continue;
    const walkingMinutes = getExactTravelMinutes(candidate.distanceM, WALK_SPEED_KMH);
    const boardingWaitMinutes = getTransitBoardingWaitMinutes(transitNode.type, transitNode.id);
    addUnifiedCustomEdge(context, candidate.id, transitNode.id, createUnifiedMultimodalEdge("walk", candidate.id, transitNode.id, routeCoordinates, transitNode.coordinates, {
      distanceM: candidate.distanceM,
      durationMinutes: walkingMinutes + boardingWaitMinutes,
      movingDurationMinutes: walkingMinutes,
      waitMinutes: boardingWaitMinutes,
      endName: transitNode.name,
    }));
    if (transitNode.id !== CORAL_WAY_TROLLEY_SCHOOL_WESTBOUND_NODE_ID) {
      addUnifiedCustomEdge(context, transitNode.id, candidate.id, createUnifiedMultimodalEdge("walk", transitNode.id, candidate.id, transitNode.coordinates, routeCoordinates, {
        distanceM: candidate.distanceM,
        durationMinutes: walkingMinutes,
        startName: transitNode.name,
      }));
    }
  }
}

function addUnifiedEndpointTransitConnectors(context, transitNodes) {
  for (const endpointId of [context.originId, context.destinationId]) {
    const endpoint = context.virtualNodes.get(endpointId);
    for (const transitNode of transitNodes) {
      const distanceM = getDistanceMeters(endpoint.coordinates, transitNode.coordinates);
      const isSafeCoralWaySchoolExit = (
        endpointId === context.destinationId
        && transitNode.id === CORAL_WAY_TROLLEY_SCHOOL_WESTBOUND_NODE_ID
        && getDistanceMeters(endpoint.coordinates, CORAL_WAY_SCHOOL_COORDINATES) < 10
      );
      if (isSafeCoralWaySchoolExit) {
        const safeAccessEdge = createUnifiedMultimodalEdge(
          "walk",
          transitNode.id,
          endpointId,
          transitNode.coordinates,
          endpoint.coordinates,
          {
            distanceM: CORAL_WAY_SCHOOL_SAFE_ACCESS_DISTANCE_METERS,
            durationMinutes: CORAL_WAY_SCHOOL_SAFE_ACCESS_MINUTES,
            startName: transitNode.name,
            endName: endpoint.name,
          },
        );
        safeAccessEdge.coordinates = CORAL_WAY_SCHOOL_SAFE_ACCESS_COORDINATES;
        addUnifiedCustomEdge(context, transitNode.id, endpointId, safeAccessEdge);
        continue;
      }

      // Only collapse genuinely co-located place/stop markers. Nearby places must traverse the
      // walking graph so intervening streets and their crossing delays remain visible to Dijkstra.
      if (distanceM > DIRECT_ENDPOINT_TRANSIT_CONNECTOR_MAX_METERS) continue;
      const walkingMinutes = getExactTravelMinutes(distanceM, WALK_SPEED_KMH);
      const boardingWaitMinutes = getTransitBoardingWaitMinutes(transitNode.type, transitNode.id);
      if (endpointId === context.originId) {
        addUnifiedCustomEdge(context, endpointId, transitNode.id, createUnifiedMultimodalEdge("walk", endpointId, transitNode.id, endpoint.coordinates, transitNode.coordinates, {
          distanceM,
          durationMinutes: walkingMinutes + boardingWaitMinutes,
          movingDurationMinutes: walkingMinutes,
          waitMinutes: boardingWaitMinutes,
          startName: endpoint.name,
          endName: transitNode.name,
        }));
      } else {
        addUnifiedCustomEdge(context, transitNode.id, endpointId, createUnifiedMultimodalEdge("walk", transitNode.id, endpointId, transitNode.coordinates, endpoint.coordinates, {
          distanceM,
          durationMinutes: walkingMinutes,
          startName: transitNode.name,
          endName: endpoint.name,
        }));
      }
    }
  }
}

function addUnifiedMetromoverRideEdges(context) {
  for (const [fromId, toId] of METROMOVER_STATION_LINKS) {
    const from = context.virtualNodes.get(fromId);
    const to = context.virtualNodes.get(toId);
    if (!from || !to) continue;
    addUnifiedBidirectionalTransitEdge(context, "metromover", from, to, getMetromoverEdgeMinutes(getDistanceMeters(from.coordinates, to.coordinates)));
  }
}

function addUnifiedWaterTaxiRideEdges(context) {
  const stops = WATER_TAXI_STOP_IDS.map((id) => context.virtualNodes.get(id)).filter(Boolean);
  if (stops.length !== 2) return;
  addUnifiedBidirectionalTransitEdge(context, "water_taxi", stops[0], stops[1], WATER_TAXI_CROSSING_MINUTES);
}

function addUnifiedBrickellTrolleyRideEdges(context) {
  const stops = BRICKELL_TROLLEY_STOP_IDS.map((id) => context.virtualNodes.get(id)).filter(Boolean);
  if (stops.length !== 2) return;
  addUnifiedBidirectionalTransitEdge(
    context,
    "brickell_trolley",
    stops[0],
    stops[1],
    BRICKELL_TROLLEY_RIDE_MINUTES,
    BRICKELL_TROLLEY_ROUTE_COORDINATES,
  );
}

function addUnifiedSouthBeachTrolleyRideEdges(context) {
  const dock = context.virtualNodes.get(SOUTH_BEACH_TROLLEY_DOCK_NODE_ID);
  const midpoint = context.virtualNodes.get(SOUTH_BEACH_TROLLEY_MIDPOINT_ID);
  const sofi = context.virtualNodes.get(SOUTH_BEACH_TROLLEY_SOFI_ID);
  if (!dock || !midpoint || !sofi) return;

  const midpointIndex = SOUTH_BEACH_TROLLEY_ROUTE_COORDINATES.findIndex(
    (coordinates) => coordinates[0] === midpoint.coordinates[0] && coordinates[1] === midpoint.coordinates[1],
  );
  if (midpointIndex < 0) return;
  const dockToMidpoint = SOUTH_BEACH_TROLLEY_ROUTE_COORDINATES.slice(0, midpointIndex + 1);
  const midpointToSofi = SOUTH_BEACH_TROLLEY_ROUTE_COORDINATES.slice(midpointIndex);
  addUnifiedDirectedTransitEdge(context, "south_beach_trolley", dock, midpoint, 12, dockToMidpoint);
  addUnifiedDirectedTransitEdge(context, "south_beach_trolley", midpoint, sofi, 11, midpointToSofi);
  addUnifiedDirectedTransitEdge(context, "south_beach_trolley", sofi, midpoint, 7, [...midpointToSofi].reverse());
  addUnifiedDirectedTransitEdge(context, "south_beach_trolley", midpoint, dock, 16, [...dockToMidpoint].reverse());
}

function addUnifiedBiscayneTrolleyRideEdges(context) {
  addUnifiedDirectedTrolleyLinks(context, "biscayne_trolley", BISCAYNE_TROLLEY_LINKS);
}

function addUnifiedLittleHavanaTrolleyRideEdges(context) {
  addUnifiedDirectedTrolleyLinks(context, "little_havana_trolley", LITTLE_HAVANA_TROLLEY_LINKS);
}

function addUnifiedCoralWayTrolleyRideEdges(context) {
  addUnifiedDirectedTrolleyLinks(context, "coral_way_trolley", CORAL_WAY_TROLLEY_LINKS);
}

function addUnifiedMetrobus26RideEdges(context) {
  addUnifiedDirectedTrolleyLinks(context, "metrobus_26", METROBUS_26_LINKS);
}

function addUnifiedDirectedTrolleyLinks(context, type, links) {
  for (const link of links) {
    const from = context.virtualNodes.get(link.fromId);
    const to = context.virtualNodes.get(link.toId);
    if (!from || !to) continue;
    addUnifiedDirectedTransitEdge(context, type, from, to, link.minutes, link.coordinates);
  }
}

function getTransitBoardingWaitMinutes(type, nodeId) {
  if (type === "coral_way_trolley") {
    return nodeId === CORAL_WAY_TROLLEY_BRICKELL_NODE_ID
      ? CORAL_WAY_TROLLEY_TO_SCHOOL_WAIT_MINUTES
      : CORAL_WAY_TROLLEY_TO_HOME_WAIT_MINUTES;
  }
  if (type === "metromover") return METROMOVER_WAIT_MINUTES;
  if (type === "water_taxi") return WATER_TAXI_WAIT_MINUTES;
  if (type === "brickell_trolley") return BRICKELL_TROLLEY_WAIT_MINUTES;
  if (type === "south_beach_trolley") return SOUTH_BEACH_TROLLEY_WAIT_MINUTES;
  if (type === "biscayne_trolley") return BISCAYNE_TROLLEY_WAIT_MINUTES;
  if (type === "little_havana_trolley") return LITTLE_HAVANA_TROLLEY_WAIT_MINUTES;
  if (type === "metrobus_26") return METROBUS_26_WAIT_MINUTES;
  return 0;
}

function addUnifiedBidirectionalTransitEdge(
  context,
  type,
  from,
  to,
  durationMinutes,
  routeCoordinates = [from.coordinates, to.coordinates],
) {
  addUnifiedDirectedTransitEdge(context, type, from, to, durationMinutes, routeCoordinates);
  addUnifiedDirectedTransitEdge(context, type, to, from, durationMinutes, [...routeCoordinates].reverse());
}

function addUnifiedDirectedTransitEdge(
  context,
  type,
  from,
  to,
  durationMinutes,
  routeCoordinates = [from.coordinates, to.coordinates],
) {
  const distanceM = getRouteDistance(routeCoordinates);
  const edge = createUnifiedMultimodalEdge(type, from.id, to.id, from.coordinates, to.coordinates, {
    distanceM,
    durationMinutes,
    startName: from.name,
    endName: to.name,
  });
  edge.coordinates = routeCoordinates;
  addUnifiedCustomEdge(context, from.id, to.id, edge);
}

function createUnifiedMultimodalEdge(type, startId, endId, startCoordinates, endCoordinates, options = {}) {
  const distanceM = options.distanceM ?? getDistanceMeters(startCoordinates, endCoordinates);
  const durationMinutes = options.durationMinutes ?? getExactTravelMinutes(distanceM, WALK_SPEED_KMH);
  return {
    type,
    distanceM,
    durationMinutes,
    movingDurationMinutes: options.movingDurationMinutes ?? durationMinutes,
    waitMinutes: options.waitMinutes ?? 0,
    coordinates: [startCoordinates, endCoordinates],
    startId,
    endId,
    startName: options.startName,
    endName: options.endName,
    trafficCrossing: Boolean(options.trafficCrossing),
    pedestrianCrossingDelayMinutes: options.pedestrianCrossingDelayMinutes || 0,
    crossingDelayMinutes: options.crossingDelayMinutes || 0,
    signalizedTrafficCrossing: Boolean(options.signalizedTrafficCrossing),
  };
}

function findShortestUnifiedMultimodalPath(context, startId, endId) {
  const makeStateId = (nodeId, inTrafficCrossing) => `${inTrafficCrossing ? "crossing" : "clear"}\u0000${nodeId}`;
  const startStateId = makeStateId(startId, false);
  const states = new Map([[startStateId, { nodeId: startId, inTrafficCrossing: false }]]);
  const distances = new Map([[startStateId, 0]]);
  const previous = new Map();
  const visited = new Set();
  const heap = new MinHeap();
  let destinationStateId = null;
  heap.push(startStateId, 0);

  while (heap.size > 0) {
    const current = heap.pop();
    if (!current || visited.has(current.id)) continue;
    const currentState = states.get(current.id);
    if (!currentState) continue;
    visited.add(current.id);
    if (currentState.nodeId === endId) {
      destinationStateId = current.id;
      break;
    }

    for (const next of getUnifiedMultimodalNeighbors(context, currentState.nodeId)) {
      const inTrafficCrossing = next.edge.type === "walk" && Boolean(next.edge.trafficCrossing);
      const enteringTrafficCrossing = inTrafficCrossing && !currentState.inTrafficCrossing;
      const traversedEdge = addPedestrianCrossingDelayToUnifiedEdge(next.edge, enteringTrafficCrossing);
      const nextStateId = makeStateId(next.toId, inTrafficCrossing);
      if (visited.has(nextStateId)) continue;
      const candidate = current.priority + traversedEdge.durationMinutes;
      if (candidate < (distances.get(nextStateId) ?? Infinity)) {
        states.set(nextStateId, { nodeId: next.toId, inTrafficCrossing });
        distances.set(nextStateId, candidate);
        previous.set(nextStateId, { stateId: current.id, edge: traversedEdge });
        heap.push(nextStateId, candidate);
      }
    }
  }

  if (!destinationStateId) return null;
  const edges = [];
  let currentStateId = destinationStateId;
  while (currentStateId !== startStateId) {
    const step = previous.get(currentStateId);
    if (!step) return null;
    edges.push(step.edge);
    currentStateId = step.stateId;
  }
  edges.reverse();
  return { edges, durationMinutes: distances.get(destinationStateId) };
}

function findPreferredUnifiedMultimodalPath(context, startId, endId) {
  const fastest = findShortestUnifiedMultimodalPath(context, startId, endId);
  if (!fastest || fastest.edges.some((edge) => edge.type !== "walk")) return fastest;

  const fastestWithTransport = findShortestUnifiedMultimodalPathUsingTransport(
    context,
    startId,
    endId,
    fastest.durationMinutes * TRANSPORT_PREFERENCE_MAX_TIME_RATIO,
  );
  if (
    fastestWithTransport
    && fastestWithTransport.durationMinutes <= fastest.durationMinutes * TRANSPORT_PREFERENCE_MAX_TIME_RATIO
  ) {
    return fastestWithTransport;
  }
  return fastest;
}

function findShortestUnifiedMultimodalPathUsingTransport(context, startId, endId, maxDurationMinutes = Infinity) {
  const makeStateId = (nodeId, hasUsedTransport, inTrafficCrossing) => (
    `${hasUsedTransport ? "transit" : "walk"}:${inTrafficCrossing ? "crossing" : "clear"}\u0000${nodeId}`
  );
  const startStateId = makeStateId(startId, false, false);
  const states = new Map([[startStateId, { nodeId: startId, hasUsedTransport: false, inTrafficCrossing: false }]]);
  const distances = new Map([[startStateId, 0]]);
  const previous = new Map();
  const visited = new Set();
  const heap = new MinHeap();
  let destinationStateId = null;
  heap.push(startStateId, 0);

  while (heap.size > 0) {
    const current = heap.pop();
    if (!current || visited.has(current.id)) continue;
    if (current.priority > maxDurationMinutes) break;
    const currentState = states.get(current.id);
    if (!currentState) continue;
    visited.add(current.id);
    if (currentState.nodeId === endId && currentState.hasUsedTransport) {
      destinationStateId = current.id;
      break;
    }

    for (const next of getUnifiedMultimodalNeighbors(context, currentState.nodeId)) {
      const hasUsedTransport = currentState.hasUsedTransport || next.edge.type !== "walk";
      const inTrafficCrossing = next.edge.type === "walk" && Boolean(next.edge.trafficCrossing);
      const enteringTrafficCrossing = inTrafficCrossing && !currentState.inTrafficCrossing;
      const traversedEdge = addPedestrianCrossingDelayToUnifiedEdge(next.edge, enteringTrafficCrossing);
      const nextStateId = makeStateId(next.toId, hasUsedTransport, inTrafficCrossing);
      if (visited.has(nextStateId)) continue;
      const candidate = current.priority + traversedEdge.durationMinutes;
      if (candidate < (distances.get(nextStateId) ?? Infinity)) {
        states.set(nextStateId, { nodeId: next.toId, hasUsedTransport, inTrafficCrossing });
        distances.set(nextStateId, candidate);
        previous.set(nextStateId, { stateId: current.id, edge: traversedEdge });
        heap.push(nextStateId, candidate);
      }
    }
  }

  if (!destinationStateId) return null;
  const edges = [];
  let currentStateId = destinationStateId;
  while (currentStateId !== startStateId) {
    const step = previous.get(currentStateId);
    if (!step) return null;
    edges.push(step.edge);
    currentStateId = step.stateId;
  }
  edges.reverse();
  return { edges, durationMinutes: distances.get(destinationStateId) };
}

function getUnifiedMultimodalNeighbors(context, nodeId) {
  const neighbors = [...(context.customAdjacency.get(nodeId) || [])];
  if (!app.routingGraph?.nodes?.[nodeId]) return neighbors;
  const fromCoordinates = getUnifiedRouteNodeCoordinates(nodeId);
  for (const next of app.routeAdjacency.get(nodeId) || []) {
    const toCoordinates = getUnifiedRouteNodeCoordinates(next.toId);
    if (!toCoordinates) continue;
    const distanceM = next.edge.distance_m || getDistanceMeters(fromCoordinates, toCoordinates);
    const movingDurationMinutes = getExactTravelMinutes(distanceM, WALK_SPEED_KMH);
    const bridgeWaitMinutes = getBrickellDrawbridgeWaitMinutes(next.edge);
    neighbors.push({
      toId: next.toId,
      edge: createUnifiedMultimodalEdge("walk", nodeId, next.toId, fromCoordinates, toCoordinates, {
        distanceM,
        durationMinutes: movingDurationMinutes + bridgeWaitMinutes,
        movingDurationMinutes,
        waitMinutes: bridgeWaitMinutes,
        trafficCrossing: isTrafficCrossingEdge(next.edge),
        pedestrianCrossingDelayMinutes: getPedestrianCrossingDelayMinutes(next.edge),
        signalizedTrafficCrossing: isSignalizedTrafficCrossingEdge(next.edge),
      }),
    });
  }
  return neighbors;
}

function coalesceUnifiedMultimodalSegments(edges) {
  const segments = [];
  let walkSegment = null;
  const flushWalk = () => {
    if (walkSegment) segments.push(walkSegment);
    walkSegment = null;
  };

  for (const edge of edges) {
    if (edge.type !== "walk") {
      flushWalk();
      segments.push({ ...edge });
      continue;
    }
    if (!walkSegment) {
      walkSegment = { ...edge, coordinates: [...edge.coordinates] };
      continue;
    }
    walkSegment.distanceM += edge.distanceM;
    walkSegment.durationMinutes += edge.durationMinutes;
    walkSegment.coordinates = mergeRouteCoordinates(walkSegment.coordinates, edge.coordinates);
    walkSegment.endId = edge.endId;
    walkSegment.endName = edge.endName || walkSegment.endName;
  }
  flushWalk();
  return segments;
}

function createTransportItinerary(edges) {
  const itinerary = [];
  let walkingMinutes = 0;
  let waitingMinutes = 0;

  const flushWalking = () => {
    if (walkingMinutes > 0.05) {
      itinerary.push({ type: "walk", label: "Walk", minutes: Math.max(1, Math.round(walkingMinutes)) });
    }
    if (waitingMinutes > 0.05) {
      itinerary.push({ type: "wait", label: "Wait", minutes: Math.max(1, Math.round(waitingMinutes)) });
    }
    walkingMinutes = 0;
    waitingMinutes = 0;
  };

  for (const edge of edges) {
    if (edge.type === "walk") {
      walkingMinutes += edge.movingDurationMinutes ?? Math.max(0, edge.durationMinutes - (edge.waitMinutes || 0));
      waitingMinutes += edge.waitMinutes || 0;
      continue;
    }

    flushWalking();
    const label = getTransitTypeLabel(edge.type);
    const previous = itinerary[itinerary.length - 1];
    if (previous?.type === edge.type) {
      previous.minutes += edge.durationMinutes;
    } else {
      itinerary.push({ type: edge.type, label, minutes: edge.durationMinutes });
    }
  }
  flushWalking();

  return itinerary.map((step) => ({
    ...step,
    minutes: Math.max(1, Math.round(step.minutes)),
  }));
}

function getTransitTypeLabel(type) {
  if (type === "metromover") return "Metromover";
  if (type === "water_taxi") return "Water taxi";
  if (type === "brickell_trolley") return "Brickell Trolley";
  if (type === "south_beach_trolley") return "South Beach Trolley";
  if (type === "biscayne_trolley") return "Biscayne Trolley";
  if (type === "little_havana_trolley") return "Little Havana Trolley";
  if (type === "coral_way_trolley") return "Coral Way Trolley";
  if (type === "metrobus_26") return "Metrobus 26";
  return "Transport";
}

function getUnifiedConnectableRouteNodes(coordinates) {
  const maxSnapDistanceM = app.routingGraph.max_snap_distance_m || DEFAULT_MAX_SNAP_DISTANCE_METERS;
  return findNearestRouteNodes(coordinates, ROUTE_SNAP_CANDIDATE_LIMIT)
    .filter((node) => node.distanceM <= maxSnapDistanceM);
}

function getUnifiedRouteNodeCoordinates(nodeId) {
  const node = app.routingGraph?.nodes?.[nodeId];
  return node ? [node.lat, node.lon] : null;
}

function getExactTravelMinutes(distanceM, speedKmh) {
  return (distanceM / 1000 / speedKmh) * 60;
}

function renderRouteGeometry(route, mode) {
  clearRouteSegments();
  if (mode === "metromover" && route.transitUsed && route.segments?.length) {
    app.routeLine.setLatLngs([]);
    app.routeLine.setStyle({ opacity: 0 });
    const transitColors = {
      metromover: "#d95d39",
      water_taxi: "#0b8ea0",
      brickell_trolley: "#7a5a2e",
      south_beach_trolley: "#4f63a8",
      biscayne_trolley: "#c75f20",
      little_havana_trolley: "#c23b54",
      coral_way_trolley: "#8a6d1d",
      metrobus_26: "#008fa8",
    };
    for (const segment of route.segments) {
      const lineOptions = {
        color: transitColors[segment.type] || "#d95d39",
        weight: 5,
        opacity: 0.95,
      };
      if (segment.type !== "walk") lineOptions.dashArray = "2 8";
      const line = L.polyline(segment.coordinates, lineOptions).addTo(app.map);
      app.routeSegmentLines.push(line);
    }
    return;
  }
  app.routeLine.setLatLngs(route.coordinates);
  app.routeLine.setStyle({
    color: "#d95d39",
    weight: 5,
    opacity: 0.95,
    dashArray: getRouteDashArray(mode),
  });
}

function setRoutePreview(coordinates, options = {}) {
  clearRouteSegments();
  app.routeLine.setLatLngs(coordinates);
  app.routeLine.setStyle({
    color: "#d95d39",
    weight: 5,
    opacity: options.opacity ?? 0.7,
    dashArray: "4 8",
  });
}

function clearRouteGeometry() {
  clearRouteSegments();
  if (app.routeLine) {
    app.routeLine.setLatLngs([]);
    app.routeLine.setStyle({ opacity: 0 });
  }
}

function clearRouteSegments() {
  for (const line of app.routeSegmentLines || []) {
    line.remove();
  }
  app.routeSegmentLines = [];
}

function getMetromoverStations() {
  return app.places.filter((place) => place.tags?.includes("metromover") && Array.isArray(place.coordinates));
}

function getWaterTaxiStops() {
  return WATER_TAXI_STOP_IDS.map((id) => app.places.find((place) => place.id === id))
    .filter((place) => place && Array.isArray(place.coordinates));
}

function getBrickellTrolleyStops() {
  return BRICKELL_TROLLEY_STOP_IDS.map((id) => app.places.find((place) => place.id === id))
    .filter((place) => place && Array.isArray(place.coordinates));
}

function getSouthBeachTrolleyStops() {
  const dock = app.places.find((place) => place.id === "place_id_water_taxi_mia_miami_beach");
  const midpoint = app.places.find((place) => place.id === SOUTH_BEACH_TROLLEY_MIDPOINT_ID);
  const sofi = app.places.find((place) => place.id === SOUTH_BEACH_TROLLEY_SOFI_ID);
  return [
    dock && {
      id: SOUTH_BEACH_TROLLEY_DOCK_NODE_ID,
      name: "Water Taxi / South Beach Trolley",
      coordinates: dock.coordinates,
    },
    midpoint,
    sofi,
  ].filter((place) => place && Array.isArray(place.coordinates));
}

function getBiscayneTrolleyStops() {
  return BISCAYNE_TROLLEY_VIRTUAL_STOPS.filter((place) => Array.isArray(place.coordinates));
}

function getLittleHavanaTrolleyStops() {
  const brickellStation = app.places.find((place) => place.id === BRICKELL_STATION_TROLLEYS_ID);
  const dominoPark = app.places.find((place) => place.id === DOMINO_PARK_TROLLEY_ID);
  return [
    brickellStation,
    ...LITTLE_HAVANA_TROLLEY_VIRTUAL_STOPS,
    dominoPark,
  ].filter((place) => place && Array.isArray(place.coordinates));
}

function getCoralWayTrolleyStops() {
  const visibleStop = app.places.find((place) => place.id === CORAL_WAY_TROLLEY_VISIBLE_STOP_ID);
  if (!visibleStop) return [];
  return CORAL_WAY_TROLLEY_VIRTUAL_STOPS.filter((place) => Array.isArray(place.coordinates));
}

function getMetrobus26Stops() {
  const visibleStops = METROBUS_26_VISIBLE_STOP_IDS
    .map((id) => app.places.find((place) => place.id === id))
    .filter((place) => place && Array.isArray(place.coordinates));
  return [...visibleStops, ...METROBUS_26_VIRTUAL_STOPS];
}

function getMetromoverEdgeMinutes(distanceM) {
  return Math.max(1, (distanceM / 1000 / METROMOVER_SPEED_KMH) * 60);
}

function mergeRouteCoordinates(...segments) {
  const merged = [];
  for (const segment of segments) {
    for (const coordinate of segment || []) {
      const previous = merged[merged.length - 1];
      if (!previous || previous[0] !== coordinate[0] || previous[1] !== coordinate[1]) {
        merged.push(coordinate);
      }
    }
  }
  return merged;
}

function findNearestRouteNode(coordinates) {
  return findNearestRouteNodes(coordinates, 1)[0] || null;
}

function findNearestRouteNodes(coordinates, limit) {
  const best = [];
  for (const node of app.routeNodes) {
    const distanceM = getDistanceMeters(coordinates, node.coordinates);
    const candidate = { id: node.id, distanceM };
    if (best.length < limit) {
      best.push(candidate);
      best.sort((a, b) => a.distanceM - b.distanceM);
    } else if (distanceM < best[best.length - 1].distanceM) {
      best[best.length - 1] = candidate;
      best.sort((a, b) => a.distanceM - b.distanceM);
    }
  }
  return best;
}

function findShortestPathBetweenCandidates(startCandidates, endCandidates, mode) {
  const makeStateId = (nodeId, inTrafficCrossing) => `${inTrafficCrossing ? "crossing" : "clear"}\u0000${nodeId}`;
  const endById = new Map(endCandidates.map((candidate) => [candidate.id, candidate]));
  const states = new Map();
  const distances = new Map();
  const previous = new Map();
  const sourceByState = new Map();
  const visited = new Set();
  const heap = new MinHeap();
  let bestEnd = null;
  let bestTotalCost = Infinity;

  for (const start of startCandidates) {
    const stateId = makeStateId(start.id, false);
    const initialCost = start.distanceM;
    if (initialCost >= (distances.get(stateId) ?? Infinity)) continue;
    states.set(stateId, { nodeId: start.id, inTrafficCrossing: false });
    distances.set(stateId, initialCost);
    previous.set(stateId, null);
    sourceByState.set(stateId, start);
    heap.push(stateId, initialCost);
  }

  while (heap.size > 0) {
    const current = heap.pop();
    if (!current || visited.has(current.id)) continue;
    if (current.priority >= bestTotalCost) break;
    const currentState = states.get(current.id);
    if (!currentState) continue;
    visited.add(current.id);

    const end = endById.get(currentState.nodeId);
    if (end) {
      const totalCost = current.priority + end.distanceM;
      if (totalCost < bestTotalCost) {
        bestTotalCost = totalCost;
        bestEnd = { stateId: current.id, end };
      }
    }

    for (const next of app.routeAdjacency.get(currentState.nodeId) || []) {
      const inTrafficCrossing = isTrafficCrossingEdge(next.edge);
      const enteringTrafficCrossing = inTrafficCrossing && !currentState.inTrafficCrossing;
      const nextStateId = makeStateId(next.toId, inTrafficCrossing);
      if (visited.has(nextStateId)) continue;
      const candidate = current.priority + getEdgeCost(next.edge, mode, { enteringTrafficCrossing });
      if (candidate < (distances.get(nextStateId) ?? Infinity)) {
        states.set(nextStateId, { nodeId: next.toId, inTrafficCrossing });
        distances.set(nextStateId, candidate);
        previous.set(nextStateId, { stateId: current.id, edge: next.edge });
        sourceByState.set(nextStateId, sourceByState.get(current.id));
        heap.push(nextStateId, candidate);
      }
    }
  }

  if (!bestEnd) return null;
  const nodeIds = [];
  const edges = [];
  let currentStateId = bestEnd.stateId;
  while (currentStateId) {
    const state = states.get(currentStateId);
    if (!state) return null;
    nodeIds.push(state.nodeId);
    const step = previous.get(currentStateId);
    if (!step) break;
    edges.push(step.edge);
    currentStateId = step.stateId;
  }
  nodeIds.reverse();
  edges.reverse();
  return {
    nodeIds,
    edges,
    start: sourceByState.get(bestEnd.stateId),
    end: bestEnd.end,
  };
}

function findShortestPath(startId, endId, mode) {
  return findShortestPathBetweenCandidates(
    [{ id: startId, distanceM: 0 }],
    [{ id: endId, distanceM: 0 }],
    mode,
  )?.nodeIds || [];
}

function getEdgeCost(edge, mode, options = {}) {
  const distance = edge.distance_m || 1;
  const profile = getRoutingProfile(mode);
  const enteringTrafficCrossing = options.enteringTrafficCrossing ?? isTrafficCrossingEdge(edge);
  const bridgePenaltyM = getBrickellDrawbridgePenaltyM(edge, profile);
  const crossingDelayPenaltyM = getPedestrianCrossingDelayPenaltyM(
    edge,
    profile,
    enteringTrafficCrossing,
  );
  const hardPenalty = getHardPenalty(edge, profile.hardPenalties || {});
  if (hardPenalty) return distance * hardPenalty + bridgePenaltyM + crossingDelayPenaltyM;

  let score = 0;
  for (const [field, weight] of Object.entries(profile.scoreWeights || {})) {
    score += (edge[field] || 0) * weight;
  }
  const multiplier = Math.max(
    profile.minMultiplier ?? 0.35,
    Math.min(profile.maxMultiplier ?? 3, 1 - score)
  );
  return distance * multiplier
    + getFixedPenalty(edge, profile.fixedPenaltiesM || {}, enteringTrafficCrossing)
    + bridgePenaltyM
    + crossingDelayPenaltyM;
}

function isTrafficCrossingEdge(edge) {
  return Boolean(edge?.traffic_crossing) || Boolean(edge) && (
    app.signalizedCrossingNodeIds.has(edge.from)
    || app.signalizedCrossingNodeIds.has(edge.to)
  );
}

function isSignalizedTrafficCrossingEdge(edge) {
  return isTrafficCrossingEdge(edge) && (
    app.signalizedCrossingNodeIds.has(edge.from)
    || app.signalizedCrossingNodeIds.has(edge.to)
  );
}

function getPedestrianCrossingDelayMinutes(edge) {
  if (!isTrafficCrossingEdge(edge)) return 0;
  return isSignalizedTrafficCrossingEdge(edge)
    ? SIGNALIZED_CROSSING_DELAY_MINUTES
    : OTHER_TRAFFIC_CROSSING_DELAY_MINUTES;
}

function getPedestrianCrossingDelayPenaltyM(edge, profile, enteringTrafficCrossing) {
  if (!enteringTrafficCrossing) return 0;
  const waitMinutes = getPedestrianCrossingDelayMinutes(edge);
  const speedKmh = profile.speedKmh || WALK_SPEED_KMH;
  return speedKmh * 1000 * waitMinutes / 60;
}

function getPedestrianCrossingDelaySummary(edges) {
  let inTrafficCrossing = false;
  let totalMinutes = 0;
  let signalizedCount = 0;
  let otherCount = 0;
  for (const edge of edges || []) {
    const crossing = isTrafficCrossingEdge(edge);
    if (crossing && !inTrafficCrossing) {
      totalMinutes += getPedestrianCrossingDelayMinutes(edge);
      if (isSignalizedTrafficCrossingEdge(edge)) signalizedCount += 1;
      else otherCount += 1;
    }
    inTrafficCrossing = crossing;
  }
  return { totalMinutes, signalizedCount, otherCount };
}

function addPedestrianCrossingDelayToUnifiedEdge(edge, enteringTrafficCrossing) {
  if (!enteringTrafficCrossing || edge.type !== "walk" || !edge.trafficCrossing) return edge;
  const delayMinutes = edge.pedestrianCrossingDelayMinutes || 0;
  if (!delayMinutes) return edge;
  return {
    ...edge,
    durationMinutes: edge.durationMinutes + delayMinutes,
    movingDurationMinutes: (edge.movingDurationMinutes ?? edge.durationMinutes) + delayMinutes,
    crossingDelayMinutes: delayMinutes,
  };
}

function getBrickellDrawbridgeWaitMinutes(edge) {
  if (!edge) return 0;
  return BRICKELL_DRAWBRIDGE_GATE_EDGES.has(`${edge.from}|${edge.to}`)
    ? BRICKELL_DRAWBRIDGE_WAIT_MINUTES
    : 0;
}

function getBrickellDrawbridgePenaltyM(edge, profile) {
  const waitMinutes = getBrickellDrawbridgeWaitMinutes(edge);
  if (!waitMinutes) return 0;
  const speedKmh = profile.speedKmh || WALK_SPEED_KMH;
  return speedKmh * 1000 * waitMinutes / 60;
}

function getRoutingProfile(mode) {
  const graphProfile = app.routingGraph?.profiles?.[mode];
  const fallback = ROUTING_PROFILES[mode] || ROUTING_PROFILES.shortest;
  if (!graphProfile || typeof graphProfile !== "object") return fallback;
  return {
    label: graphProfile.label || fallback.label,
    speedKmh: fallback.speedKmh,
    scoreWeights: graphProfile.scoreWeights || graphProfile.score_weights || fallback.scoreWeights,
    minMultiplier: graphProfile.minMultiplier ?? graphProfile.min_multiplier ?? fallback.minMultiplier,
    maxMultiplier: graphProfile.maxMultiplier ?? graphProfile.max_multiplier ?? fallback.maxMultiplier,
    hardPenalties: graphProfile.hardPenalties || graphProfile.hard_penalties || fallback.hardPenalties,
    fixedPenaltiesM: graphProfile.fixedPenaltiesM || graphProfile.fixed_penalties_m || fallback.fixedPenaltiesM,
  };
}

function getHardPenalty(edge, hardPenalties) {
  for (const [rule, multiplier] of Object.entries(hardPenalties)) {
    const [field, expected] = rule.split("=");
    if (edge[field] === expected) return multiplier;
  }
  return 0;
}

function getFixedPenalty(edge, fixedPenaltiesM, enteringTrafficCrossing = true) {
  let penalty = 0;
  for (const [field, penaltyM] of Object.entries(fixedPenaltiesM)) {
    if (field === "traffic_crossing" && !enteringTrafficCrossing) continue;
    if (edge[field]) penalty += penaltyM;
  }
  return penalty;
}

function getRouteDistance(coordinates) {
  let distance = 0;
  for (let index = 1; index < coordinates.length; index += 1) {
    distance += getDistanceMeters(coordinates[index - 1], coordinates[index]);
  }
  return distance;
}

function getDistanceMeters(a, b) {
  const lat1 = toRadians(a[0]);
  const lat2 = toRadians(b[0]);
  const dLat = lat2 - lat1;
  const dLon = toRadians(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.sqrt(h));
}

function toRadians(value) {
  return value * Math.PI / 180;
}

function formatDistance(distanceM) {
  if (distanceM < 1000) return `${Math.round(distanceM)} m`;
  return `${(distanceM / 1000).toFixed(1)} km`;
}

function formatRouteStatus(modeLabel, from, to, route, mode) {
  const summary = modeLabel + ": " + from.name + " -> " + to.name + " (" + formatRouteSummary(route, mode) + ")";
  if (mode !== "metromover" || !route.itinerary?.length) return summary;
  const path = route.itinerary.map((step) => step.label + " " + step.minutes + "m").join(" -> ");
  return summary + String.fromCharCode(10) + "Path: " + path;
}

function formatRouteSummary(distanceM, mode) {
  if (typeof distanceM === "object") {
    const route = distanceM;
    const durationMinutes = route.durationMinutes ?? getTravelMinutes(route.distanceM, mode);
    return formatDistance(route.distanceM) + " | " + formatDuration(durationMinutes);
  }
  return formatDistance(distanceM) + " | " + formatDuration(getTravelMinutes(distanceM, mode));
}
function getTravelMinutes(distanceM, mode) {
  const speedKmh = getRoutingProfile(mode).speedKmh || 5;
  const exactMovingMinutes = (distanceM / 1000 / speedKmh) * 60;
  const movingMinutes = Math.max(1, Math.round(exactMovingMinutes));
  if (mode !== "kid_scooter") return movingMinutes;
  const breakCount = Math.floor(Math.max(0, exactMovingMinutes - 0.001) / KID_SCOOTER_BREAK_INTERVAL_MINUTES);
  const breakMinutes = breakCount === 0
    ? 0
    : KID_SCOOTER_FIRST_BREAK_MINUTES + (breakCount - 1) * KID_SCOOTER_LATER_BREAK_MINUTES;
  return movingMinutes + breakMinutes;
}

function formatDuration(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!remainder) return `${hours}h`;
  return `${hours}h ${remainder}m`;
}

function getTravelModeLabel(mode) {
  return getRoutingProfile(mode).label;
}

function getRouteDashArray(mode) {
  if (mode === "shortest") return null;
  if (mode === "scenic") return "2 8";
  if (mode === "metromover") return null;
  return "12 8";
}

class MinHeap {
  constructor() {
    this.items = [];
  }

  get size() {
    return this.items.length;
  }

  push(id, priority) {
    this.items.push({ id, priority });
    this.bubbleUp(this.items.length - 1);
  }

  pop() {
    if (this.items.length === 0) return null;
    const root = this.items[0];
    const tail = this.items.pop();
    if (this.items.length > 0) {
      this.items[0] = tail;
      this.bubbleDown(0);
    }
    return root;
  }

  bubbleUp(index) {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.items[parentIndex].priority <= this.items[index].priority) break;
      [this.items[parentIndex], this.items[index]] = [this.items[index], this.items[parentIndex]];
      index = parentIndex;
    }
  }

  bubbleDown(index) {
    while (true) {
      const leftIndex = index * 2 + 1;
      const rightIndex = index * 2 + 2;
      let smallestIndex = index;
      if (leftIndex < this.items.length && this.items[leftIndex].priority < this.items[smallestIndex].priority) {
        smallestIndex = leftIndex;
      }
      if (rightIndex < this.items.length && this.items[rightIndex].priority < this.items[smallestIndex].priority) {
        smallestIndex = rightIndex;
      }
      if (smallestIndex === index) break;
      [this.items[index], this.items[smallestIndex]] = [this.items[smallestIndex], this.items[index]];
      index = smallestIndex;
    }
  }
}

function centerHome() {
  const home = app.state.user_profile.home_base;
  app.map.setView(home, DEFAULT_HOME_ZOOM, { animate: true });
}

function getSearchText(place) {
  return normalizeSearchText([
    place.name,
    ...(place.tags || []),
    ...(place.filterTags || []),
    place.meta?.category,
    place.meta?.source_list,
  ].filter(Boolean).join(" "));
}

function getFilterTags(place) {
  const rawTags = new Set(place.tags || []);
  const category = normalizeSearchText(place.meta?.category || "");
  const name = normalizeSearchText(place.name || "");
  const text = `${name} ${category}`;
  const filterTags = [];

  const hasDessert = hasAnyTag(rawTags, DESSERT_FILTER_TAGS) || /\b(bakery|dessert|gelato|ice cream)\b/.test(text);
  const hasFood = hasAnyTag(rawTags, FOOD_FILTER_TAGS)
    || /\b(restaurant|bakery|cafe|coffee|dessert|grill|pizza|sushi|mediterranean|mexican|asian|ice cream)\b/.test(text);
  const hasSupermarket = hasAnyTag(rawTags, SUPERMARKET_FILTER_TAGS) || /\bsupermarket\b/.test(text);
  const hasSchool = hasAnyTag(rawTags, SCHOOL_FILTER_TAGS) || /\b(school|academy|montessori|preschool)\b/.test(text);
  const hasPlayground = hasAnyTag(rawTags, PLAYGROUND_FILTER_TAGS);
  const hasPark = hasAnyTag(rawTags, PARK_FILTER_TAGS);
  const hasTransport = hasAnyTag(rawTags, TRANSPORT_FILTER_TAGS) || /\b(metromover|water taxi|trolley|metrobus|bus 26)\b/.test(text);
  const hasIndoors = hasAnyTag(rawTags, INDOOR_FILTER_TAGS);

  if (hasFood) filterTags.push("food");
  if (hasDessert) filterTags.push("dessert");
  if (hasSupermarket) filterTags.push("supermarket");
  if (hasSchool) filterTags.push("schools");
  if (hasPlayground) filterTags.push("playgrounds");
  if (hasPark) filterTags.push("parks");
  if (hasTransport) filterTags.push("transport");
  if (hasIndoors) filterTags.push("indoors");
  return filterTags;
}

function hasAnyTag(rawTags, wantedTags) {
  for (const tag of wantedTags) {
    if (rawTags.has(tag)) return true;
  }
  return false;
}

function normalizeSearchText(value) {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function getPopupHtml(place) {
  const meta = place.meta || {};
  return `
    <strong>${escapeHtml(place.name)}</strong>
    <span>${escapeHtml(meta.category || "Place")}</span>
  `;
}

function getGoogleMapsUrl(place) {
  const address = place.meta?.address;
  const searchText = place.meta?.google_maps_query
    || (address ? `${place.name}, ${address}` : `${place.name}, Miami FL`);
  return `https://www.google.com/maps/search/${encodeURIComponent(searchText)}`;
}

function getPlaceSubtitle(place) {
  const meta = place.meta || {};
  const parts = [];
  if (meta.distance_from_home_m !== undefined) parts.push(`${meta.distance_from_home_m} m`);
  if (meta.category) parts.push(escapeHtml(meta.category));
  return parts.join(" | ");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char]);
}

function registerServiceWorker() {
  if (new URLSearchParams(window.location.search).get("no-sw") === "1") return;
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js?v=212", { updateViaCache: "none" })
      .then((registration) => navigator.serviceWorker.ready.then((readyRegistration) => {
        requestOfflineTileCache(readyRegistration || registration);
      }))
      .catch((error) => {
        console.info("Offline service worker unavailable.", error);
      });
  }
}

function requestOfflineTileCache(registration) {
  const worker = registration?.active || navigator.serviceWorker.controller;
  if (!worker) return;
  worker.postMessage({
    type: "CACHE_OFFLINE_TILES",
    batchSize: 1,
    throttleMs: 250,
  });
}

function getRequestedMapView() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("qa-view") !== "1") {
    return { center: null, zoom: null };
  }
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  const zoom = Number(params.get("z"));
  return {
    center: Number.isFinite(lat) && Number.isFinite(lon) ? [lat, lon] : null,
    zoom: Number.isFinite(zoom) ? zoom : null,
  };
}

window.spinApi = {
  app,
  getVisiblePlaces,
  selectPlace,
  setTravelMode,
  renderRoute,
  getLocalRoute,
  getEdgeCost,
  getTravelMinutes,
};
