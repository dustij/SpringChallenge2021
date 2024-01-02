// Implement your algorithm here ===================================================

function getNextAction(state: GameState): Action {
  // TODO: Implement your algorithm to select the next action based on the game state
  console.error(state.possibleActions)

  // Note: the lower the target cell index, the closer the cell is to the center
  // thus making it more valuable, so we sort the possible actions by target cell index

  // Try to complete a tree first
  const completes = state.possibleActions.filter((a) => a.type === COMPLETE)
  if (completes.length > 0) {
    if (completes.length > 1) {
      return completes.sort((a, b) => a.target! - b.target!)[0]
    }
    return completes[0]
  }

  // Try to grow a tree if we have enough sun
  const grows = state.possibleActions.filter((a) => a.type === GROW)
  if (grows.length > 0) {
    if (grows.length > 1) {
      grows.sort((a, b) => a.target! - b.target!)[0]
    }

    for (const grow of grows) {
      const growCost = getGrowCost(state, grow.target!)
      if (state.mySun >= growCost) {
        return grow
      }
    }
  }

  // Try to seed a tree if we have enough sun
  const seeds = state.possibleActions.filter((a) => a.type === SEED)
  if (seeds.length > 0) {
    if (seeds.length > 1) {
      seeds.sort((a, b) => a.source! - b.source!)[0]
    }

    for (const seed of seeds) {
      const seedCost = getSeedCost(state)
      if (state.mySun >= seedCost) {
        // Find the cell with the highest richness
        const seedsBySource = seeds.filter((s) => s.source === seed.source)
        const richestSeed = seedsBySource.sort(
          (a, b) =>
            state.cells[b.target!].richness - state.cells[a.target!].richness
        )[0]

        // Richest seed must not be unusable
        if (state.cells[richestSeed.target!].richness !== 0) {
          return richestSeed
        }
      }
    }
  }

  // Wait if we can't do anything else
  return state.possibleActions[0]
}

// ================================================================================

function getGrowCost(state: GameState, target: number): number {
  const treeSize = state.trees.find((t) => t.cellIndex === target)!.size
  const numberOfTreesOfSize = state.trees.filter(
    (t) => t.size === treeSize + 1
  ).length

  const baseCost = [1, 3, 7][treeSize]
  const totalCost = baseCost + numberOfTreesOfSize

  return totalCost
}

function getSeedCost(state: GameState): number {
  const numberOfSeeds = state.trees.filter((t) => t.size === 0).length
  const totalCost = 1 + numberOfSeeds

  return totalCost
}

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
  round: number
  nutrients: number
  cells: Cell[]
  possibleActions: Action[]
  trees: Tree[]
  mySun: number
  myScore: number
  opponentSun: number
  opponentScore: number
  opponentIsWaiting: boolean
  day: number
}

function initialState(): GameState {
  return {
    round: 0,
    nutrients: 0,
    cells: [],
    possibleActions: [],
    trees: [],
    mySun: 0,
    myScore: 0,
    opponentSun: 0,
    opponentScore: 0,
    opponentIsWaiting: false,
    day: 0,
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
    gameState.cells.push(
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

    const action = getNextAction(gameState)
    console.log(actionToString(action))
  }
}

mainloop()
