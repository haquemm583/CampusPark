// Approximate positions read from the university's campus map on a common
// drawing grid. The walking network is a simulation of the mapped corridors.
export const walkNodes = {
  hri: [316, 402], nrc: [408, 495], scienceLabs: [406, 647], boatBarn: [447, 672],
  islandBlvd: [445, 505], osoWest: [446, 653], osoEast: [716, 653],
  starfish: [586, 350], angelfish: [594, 500], ecdc: [625, 407],
  seagullNorth: [721, 497], library: [770, 526], seagullSouth: [742, 712],
  dolphin: [746, 817], turtleCove: [900, 827], wellness: [934, 747],
  instruction: [939, 657], plaza: [1042, 658], curlew: [1072, 544],
  eastResidence: [1292, 652], eastCrossing: [1340, 420], hammerhead: [1370, 420],
  miramarSouth: [1260, 843], arts: [926, 430], performingArts: [1053, 367],
  sandDollar: [1078, 410], wavecrest: [1205, 419], oceanDrive: [936, 267],
  // Momentum inset uses its own map scale.
  islanderWay: [631, 1114], recFields: [620, 1140], momentumHousing: [682, 1131],
  momentumAthletics: [477, 1120], nile: [571, 1118], alumni: [576, 929],
}

export const walkCorridors = [
  ['hri', 'nrc', 'scienceLabs', 'boatBarn', 'osoWest', 'osoEast', 'seagullSouth', 'wellness', 'turtleCove', 'miramarSouth', 'eastResidence'],
  ['nrc', 'islandBlvd', 'osoWest'], ['islandBlvd', 'angelfish', 'seagullNorth', 'seagullSouth', 'dolphin', 'turtleCove'],
  ['starfish', 'angelfish', 'ecdc', 'arts', 'oceanDrive'], ['seagullNorth', 'arts', 'performingArts', 'sandDollar', 'wavecrest', 'eastCrossing', 'hammerhead'],
  ['seagullNorth', 'library', 'instruction', 'plaza', 'eastResidence', 'eastCrossing'],
  ['arts', 'library'], ['arts', 'curlew', 'plaza', 'miramarSouth'], ['curlew', 'wavecrest'],
  ['seagullSouth', 'instruction', 'wellness'], ['dolphin', 'wellness'],
  ['momentumAthletics', 'nile', 'islanderWay', 'momentumHousing'],
  ['islanderWay', 'recFields'], ['nile', 'alumni'],
]

// [Name, campus map abbreviation, pedestrian waypoint, x, y]
export const destinations = [
  ['Center for Instruction', 'CI', 'instruction', 975, 654],
  ['Bay Hall', 'BH', 'arts', 982, 482],
  ['Island Hall', 'IH', 'turtleCove', 1012, 823],
  ['Mary and Jeff Bell Library', 'LIB', 'library', 841, 530],
  ['Carlos Truan Natural Resources Center', 'NRC', 'nrc', 352, 534],
  ['Center for the Arts', 'CA', 'arts', 965, 414],
  ['Center for the Sciences', 'CS', 'instruction', 856, 634],
  ['Classroom West', 'CW', 'angelfish', 623, 473],
  ['Conrad Blucher Institute', 'CBI', 'scienceLabs', 373, 627],
  ['Corpus Christi Hall', 'CCH', 'arts', 861, 391],
  ['Dining Hall', '', 'plaza', 1178, 695],
  ['Dr. Robert R. Furgason Engineering Building', 'RFEB', 'seagullSouth', 786, 662],
  ['Driftwood Counseling Center', 'DRIFT', 'curlew', 1218, 514],
  ['Dugan Wellness Center', 'DWC', 'wellness', 977, 769],
  ['Early Childhood Development Center', 'ECDC', 'ecdc', 677, 359],
  ['Education Center for Mathematics and Science', 'ECMS', 'ecdc', 700, 388],
  ['Faculty Center', 'FC', 'instruction', 948, 564],
  ['Field House', 'FH', 'plaza', 1043, 702],
  ['Glasscock Center', 'GSSC', 'library', 799, 615],
  ['Harte Research Institute', 'HRI', 'hri', 258, 374],
  ['Islander Welcome Center', '', 'library', 860, 474],
  ['John O. Chapman Field', '', 'turtleCove', 1118, 870],
  ['Michael and Karen O’Connor Building', 'OCNR', 'arts', 801, 410],
  ['Miramar University Housing', '', 'eastResidence', 1331, 705],
  ['Performing Arts Center', 'PAC', 'performingArts', 1030, 333],
  ['Sandpiper Health Services', 'SAND', 'curlew', 1257, 515],
  ['Student Services Center (Round Building)', 'SSC', 'library', 915, 470],
  ['Tidal Hall', 'TH', 'starfish', 517, 407],
  ['University Center', 'UC', 'wellness', 841, 755],
  ['University Services Center', 'USC', 'oceanDrive', 916, 328],
  ['Dr. Jack Dugan Family Soccer and Track Stadium', '', 'momentumAthletics', 415, 1100],
  ['Momentum Recreation Fields', '', 'recFields', 615, 1165],
  ['Momentum Village University Housing', '', 'momentumHousing', 730, 1144],
  ['Thomas J. Henry Tennis Center', '', 'nile', 542, 1097],
  ['Woo Sung Lee Alumni Welcome Center', '', 'alumni', 574, 924],
]

export const permits = {
  A: 'Zone A', B: 'Zone B', C: 'Zone C', D: 'Zone D',
}

// Row counts define the synthetic inventory. Each row has eight sample stalls.
// Access roads are area references for the schematic, not turn-by-turn directions.
// [ID, label, permits, pedestrian waypoint, x, y, access road, rows, demand profile]
export const parkingAreas = [
  ...[1, 2, 3, 4].map(floor => [
    `BG${floor}`, `Bayside Parking Garage · Floor ${floor}`, floor === 4 ? ['A', 'B'] : ['A'],
    'osoEast', 671, 602, 'Oso Lane', 7, floor === 4 ? 'commuter' : 'core',
  ]),
  ['JF', 'Jellyfish Lot', ['A'], 'dolphin', 718, 773, 'Dolphin Lane', 6, 'core'],
  ['AF', 'Angelfish Lot', ['A'], 'seagullNorth', 687, 464, 'Surf Lane', 3, 'core'],
  ['AD', 'Angelfish Drive', ['A'], 'ecdc', 665, 421, 'Angelfish Drive', 1, 'core'],
  ['TC', 'Turtle Cove Lot', ['A', 'B'], 'turtleCove', 882, 858, 'Dolphin Lane', 6, 'recreation'],
  ['NRC', 'Natural Resources Center Lot', ['A', 'B'], 'nrc', 363, 465, 'Island Boulevard', 4, 'commuter'],
  ['SD', 'Sand Dollar Lot', ['A', 'B'], 'sandDollar', 1186, 363, 'Sand Dollar Boulevard', 9, 'arts'],
  ['CL', 'Curlew Lot', ['A', 'B'], 'curlew', 1075, 585, 'Curlew Lane', 4, 'core'],
  ['T', 'Tarpon Lot', ['A', 'B'], 'wavecrest', 1250, 438, 'Wavecrest Drive', 5, 'core'],
  ['SF', 'Starfish Lot', ['A', 'B'], 'starfish', 527, 341, 'Starfish Lane', 4, 'commuter'],
  ['HRI', 'Harte Research Institute Lot', ['A', 'B'], 'hri', 378, 408, 'Island Boulevard', 3, 'commuter'],
  ['CBI', 'Conrad Blucher Institute Lot', ['A', 'B'], 'scienceLabs', 408, 617, 'Island Boulevard', 2, 'commuter'],
  ['SH', 'Sea Horse Lot', ['A', 'B', 'C'], 'osoWest', 537, 603, 'Oso Lane', 8, 'commuter'],
  ['AL', 'Woo Sung Lee Alumni Welcome Center Lot', ['A', 'B', 'C'], 'alumni', 587, 933, 'Ennis Joslin Road', 3, 'commuter'],
  ['H', 'Hammerhead Lot', ['A', 'B', 'C', 'D'], 'hammerhead', 1442, 386, 'Sand Dollar Boulevard', 11, 'overflow'],
  ['BB', 'Boat Barn Lot', ['A', 'B'], 'boatBarn', 404, 698, 'Island Boulevard', 2, 'commuter'],
]
