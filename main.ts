// Implement your algorithm here ===================================================
const LARGE_TREE_THRESHOLD = 2
const STOP_SEEDING_DAY = 21
const EARLY_GAME_THRESHOLD = 3
const MID_GAME_THRESHOLD = 12
const LATE_GAME_THRESHOLD = 21
const CORENER_INDEXES = [19, 22, 25, 28, 31, 34]
const OUTSIDE_INDEXES = [
  19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
]

function getNextAction(state: GameState): Action {
  // console.error(state.possibleActions)

  // Note: the lower the target cell index, the closer the cell is to the center
  // thus making it more valuable, so we sort the possible actions by target cell index

  // Day 0 seed along outside if possible
  if (state.day === 0) {
    const seeds = state.possibleActions.filter((a) => a.type === SEED)

    // Group seeds by source
    const seedsBySource = seeds.reduce((acc, seed) => {
      if (!acc[seed.source!]) {
        acc[seed.source!] = []
      }
      acc[seed.source!].push(seed)
      return acc
    }, {} as { [key: number]: Action[] })

    // Sort each group by target cell index, descending
    for (const source in seedsBySource) {
      seedsBySource[source].sort((a, b) => b.target! - a.target!)
    }

    // Filter out seeds that are not on the outside
    for (const source in seedsBySource) {
      seedsBySource[source] = seedsBySource[source].filter((seed) =>
        OUTSIDE_INDEXES.includes(seed.target!)
      )
    }

    console.error(seedsBySource)

    // Return see if target is 19
    for (const source in seedsBySource) {
      if (seedsBySource[source].length > 0) {
        if (seedsBySource[source][0].target === 19) {
          return seedsBySource[source][0]
        }
      }
    }

    // Pick the first seed from the first group
    for (const source in seedsBySource) {
      if (seedsBySource[source].length > 0) {
        return seedsBySource[source][0]
      }
    }
  }

  // If it is early game, grow non-corner tree to size 2
  if (state.day < EARLY_GAME_THRESHOLD) {
    const grows = state.possibleActions.filter((a) => a.type === GROW)
    grows.sort((a, b) => b.target! - a.target!)

    for (const grow of grows) {
      // If tree is in the corner, grow it to size 2
      if (!CORENER_INDEXES.includes(grow.target!)) {
        if (state.trees.find((t) => t.cellIndex === grow.target)!.size === 1) {
          return grow
        }
      }
    }
  }

  // Prioritize seeding the center
  const seedsToCenter = state.possibleActions.filter(
    (a) => a.type === SEED && state.cells![a.target!].richness === 3
  )

  if (seedsToCenter.length > 0 && state.day < STOP_SEEDING_DAY) {
    seedsToCenter.sort((a, b) => a.target! - b.target!)
    return seedsToCenter[0]
  }

  // Try to complete a tree first, but only if we have more than a certain amount
  const completes = state.possibleActions.filter((a) => a.type === COMPLETE)
  if (completes.length > LARGE_TREE_THRESHOLD) {
    completes.sort((a, b) => a.target! - b.target!)

    for (const complete of completes) {
      // If tree is in the center and it's not late enough, skip it
      if (complete.target! === 0 && state.day < LATE_GAME_THRESHOLD) {
        continue
      }

      return complete
    }
  }

  // Try to grow best tree
  const grows = state.possibleActions.filter((a) => a.type === GROW)
  if (grows.length > 0) {
    // Sort by target cell index
    grows.sort((a, b) => a.target! - b.target!)

    // Sort by tree size
    grows.sort(
      (a, b) =>
        state.trees.find((t) => t.cellIndex === b.target)!.size -
        state.trees.find((t) => t.cellIndex === a.target)!.size
    )

    console.error(grows)

    // Get shadow and sun side for next turn
    const shadowSide = getShadowSide(state)
    const sunSide = getSunSide(shadowSide)

    console.error("shadowSide", shadowSide)
    console.error("sunSide", sunSide)

    for (const grow of grows) {
      // If tree is in the center then grow it regardless of shadow
      if (grow.target === 0) {
        return grow
      }

      // From the options, pick the best one that will not be shadowed next turn
      const tree = state.trees.find((t) => t.cellIndex === grow.target)
      let cell = state.cells![tree!.cellIndex]

      // Start be determining how many cells (sun side) to check for trees, based on tree size next turn if we grow
      const treeNextSize = tree!.size + 1

      // Then check if there is a tree there and if it will be casting a large enough shadow
      let shadowed = false
      for (let i = 0; i < treeNextSize; i++) {
        console.error("checking", grow.target)
        console.error("tree", tree)
        console.error("cell", cell)

        const neighborCellIndex = cell.neighbors[sunSide]

        console.error("checking neighbor", neighborCellIndex)

        if (neighborCellIndex !== -1) {
          // There is a cell there, check if there is a tree and if it will be casting a large enough shadow
          const checkCellTree = state.trees.find(
            (t) => t.cellIndex === neighborCellIndex
          )

          const checkCellTreeSize = checkCellTree ? checkCellTree.size : 0

          if (checkCellTreeSize >= treeNextSize) {
            // It will be casting a large enough shadow, so skip this grow action
            console.error(neighborCellIndex, "will shadow", grow.target)
            shadowed = true
            break
          }

          // Move to next cell in the sun side
          cell = state.cells![neighborCellIndex]
        } else {
          // There is no cell there, so we're done checking
          break
        }
      }

      // If not, return that action, otherwise continue to check the next Sone
      if (!shadowed) {
        return grow
      }
    }

    // If we can't find a good tree, just return the first one
    return grows[0]
  }

  // Try to seed a tree from center to outside while being mindfull of sun position
  const seeds = state.possibleActions.filter((a) => a.type === SEED)
  if (seeds.length > 0) {
    seeds.sort((a, b) => a.source! - b.source!)

    for (const seed of seeds) {
      // Find the cell with the highest richness
      const seedsBySource = seeds.filter((s) => s.source === seed.source)
      const seedsByRichness = seedsBySource.sort(
        (a, b) =>
          state.cells![b.target!].richness - state.cells![a.target!].richness
      )

      // Richest seed must NOT be unusable
      let richestSeed = seedsByRichness[0]
      if (
        state.cells![richestSeed.target!].richness !== 0 &&
        state.day < STOP_SEEDING_DAY
      ) {
        return richestSeed
      }
    }
  }

  // Wait if we can't do anything else
  return state.possibleActions[0]
}

function getSunSide(shadowSide: number) {
  return (shadowSide + 3) % 6
}

function getShadowSide(state: GameState) {
  return (state.day + 1) % 6
}

// ================================================================================

interface Cell {
  index: number
  richness: number
  neighbors: [number, number, number, number, number, number]
}

function createCell(
  index: number,
  richness: number,
  neighbors: [number, number, number, number, number, number]
): Cell {
  return { index, richness, neighbors }
}

interface Tree {
  cellIndex: number
  size: number
  isMine: boolean
  isDormant: boolean
}

function createTree(
  cellIndex: number,
  size: number,
  isMine: boolean,
  isDormant: boolean
): Tree {
  return { cellIndex, size, isMine, isDormant }
}

const WAIT = "WAIT"
const SEED = "SEED"
const GROW = "GROW"
const COMPLETE = "COMPLETE"

type ACTION_TYPES = typeof WAIT | typeof SEED | typeof GROW | typeof COMPLETE

interface Action {
  type: ACTION_TYPES
  target?: number
  source?: number
}

function createAction(
  type: ACTION_TYPES,
  target?: number,
  source?: number
): Action {
  return { type, target, source }
}

function parseAction(line: string): Action {
  const parts = line.split(" ")

  switch (parts[0]) {
    case WAIT:
      return createAction(WAIT)
    case SEED:
      return createAction(SEED, parseInt(parts[2]), parseInt(parts[1]))
    default:
      return createAction(parts[0] as ACTION_TYPES, parseInt(parts[1]))
  }
}

function actionToString(action: Action) {
  switch (action.type) {
    case WAIT:
      return WAIT
    case SEED:
      return `${SEED} ${action.source} ${action.target}`
    default:
      return `${action.type} ${action.target}`
  }
}

interface GameState {
  day: number
  nutrients: number
  cells?: Cell[]
  possibleActions: Action[]
  trees: Tree[]
  mySun: number
  myScore: number
  opponentSun: number
  opponentScore: number
  opponentIsWaiting: boolean
}

function initialState(): GameState {
  return {
    day: 0,
    nutrients: 0,
    cells: [],
    possibleActions: [],
    trees: [],
    mySun: 0,
    myScore: 0,
    opponentSun: 0,
    opponentScore: 0,
    opponentIsWaiting: false,
  }
}

function updateGameState(
  state: GameState,
  updates: Partial<GameState>
): GameState {
  return { ...state, ...updates }
}

function mainloop() {
  let gameState = initialState()

  // @ts-ignore
  const numberOfCells = parseInt(readline())

  for (let i = 0; i < numberOfCells; i++) {
    // @ts-ignore
    var inputs = readline().split(" ")
    const index = parseInt(inputs[0])
    const richness = parseInt(inputs[1])
    const neigh0 = parseInt(inputs[2])
    const neigh1 = parseInt(inputs[3])
    const neigh2 = parseInt(inputs[4])
    const neigh3 = parseInt(inputs[5])
    const neigh4 = parseInt(inputs[6])
    const neigh5 = parseInt(inputs[7])
    gameState.cells!.push(
      createCell(index, richness, [
        neigh0,
        neigh1,
        neigh2,
        neigh3,
        neigh4,
        neigh5,
      ])
    )
  }

  while (true) {
    // @ts-ignore
    gameState = updateGameState(gameState, { day: parseInt(readline()) })
    // @ts-ignore
    gameState = updateGameState(gameState, { nutrients: parseInt(readline()) })
    // @ts-ignore
    let inputs = readline().split(" ")
    gameState = updateGameState(gameState, {
      mySun: parseInt(inputs[0]),
      myScore: parseInt(inputs[1]),
    })
    // @ts-ignore
    inputs = readline().split(" ")
    gameState = updateGameState(gameState, {
      opponentSun: parseInt(inputs[0]),
      opponentScore: parseInt(inputs[1]),
      opponentIsWaiting: inputs[2] !== "0",
    })

    // Reset trees and possible actions
    gameState = updateGameState(gameState, {
      trees: [],
      possibleActions: [],
    })

    // @ts-ignore
    const numberOfTrees = parseInt(readline())
    let newTrees: Tree[] = []
    for (let i = 0; i < numberOfTrees; i++) {
      // @ts-ignore
      let inputs = readline().split(" ")
      const cellIndex = parseInt(inputs[0])
      const size = parseInt(inputs[1])
      const isMine = inputs[2] !== "0"
      const isDormant = inputs[3] !== "0" // ignore in this leage
      newTrees.push(createTree(cellIndex, size, isMine, isDormant))
    }
    gameState = updateGameState(gameState, { trees: newTrees })

    // @ts-ignore
    const numberOfPossibleActions = parseInt(readline())
    let newActions: Action[] = []
    for (let i = 0; i < numberOfPossibleActions; i++) {
      // @ts-ignore
      newActions.push(parseAction(readline()))
    }
    gameState = updateGameState(gameState, { possibleActions: newActions })

    // Debugging
    const gameStateCopy = { ...gameState }
    delete gameStateCopy.cells
    console.error(gameStateCopy)

    // Output action
    const action = getNextAction(gameState)
    console.log(actionToString(action))
  }
}

mainloop()
