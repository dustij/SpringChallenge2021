// Implement your algorithm here ===================================================
const LARGE_TREE_THRESHOLD = 2

function getNextAction(state: GameState): Action {
  // console.error(state.possibleActions)

  // Note: the lower the target cell index, the closer the cell is to the center
  // thus making it more valuable, so we sort the possible actions by target cell index

  // Prioritize seeding the center (richness 3)
  const seedsToCenter = state.possibleActions.filter(
    (a) => a.type === SEED && state.cells[a.target!].richness === 3
  )

  if (seedsToCenter.length > 0) {
    if (seedsToCenter.length > 1) {
      seedsToCenter.sort((a, b) => a.target! - b.target!)
    }

    return seedsToCenter[0]
  }

  // Try to complete a tree first, but only if we have more than a certain amount
  const completes = state.possibleActions.filter((a) => a.type === COMPLETE)
  if (completes.length > LARGE_TREE_THRESHOLD) {
    if (completes.length > 1) {
      completes.sort((a, b) => a.target! - b.target!)
    }
    return completes[0]
  }

  // Try to grow best tree, sorted largest to smallest then center to outside
  const grows = state.possibleActions.filter((a) => a.type === GROW)
  if (grows.length > 0) {
    if (grows.length > 1) {
      grows.sort((a, b) => a.target! - b.target!)
      grows.sort(
        (a, b) =>
          state.trees.find((t) => t.cellIndex === b.target)!.size -
          state.trees.find((t) => t.cellIndex === a.target)!.size
      )
    }
    return grows[0]
    // // shadow next turn
    // const shadowIndexNextTurn = (state.day + 1) % 6
    // const oppositeShadowIndexNextTurn =
    //   oppositeDirectionIndex(shadowIndexNextTurn)

    // // Avoid growing trees that will be effected by shadow next turn
    // for (const grow of grows) {
    //   // Find the cell that will be casting shadow
    //   const oppositeShadowCellIndex =
    //     state.cells[grow.target!].neighbors[oppositeShadowIndexNextTurn]

    //   if (oppositeShadowCellIndex !== -1) {
    //     // If there is a tree here...
    //     const treeCastingShadow = state.trees.find(
    //       (t) => t.cellIndex === oppositeShadowCellIndex
    //     )
    //     const targetGrowTree = state.trees.find(
    //       (t) => t.cellIndex === grow.target
    //     )
    //     if (treeCastingShadow) {
    //       // ... and it's bigger than the tree we're trying to grow...
    //       if (treeCastingShadow.size >= targetGrowTree!.size + 1) {
    //         // ... then skip this grow
    //         console.error("Skipping grow for:", grow.target)
    //         console.error("Tree casting shadow:", treeCastingShadow.cellIndex)
    //         continue
    //       } else {
    //         // ... otherwise grow this tree
    //         return grow
    //       }
    //     }
    //   } else {
    //     // No tree casting shadow, grow this tree
    //     return grow
    //   }
    // }
  }

  // Try to seed a tree from center to outside while being mindfull of sun position
  const seeds = state.possibleActions.filter((a) => a.type === SEED)
  if (seeds.length > 0) {
    if (seeds.length > 1) {
      seeds.sort((a, b) => a.source! - b.source!)
    }

    for (const seed of seeds) {
      // Find the cell with the highest richness
      const seedsBySource = seeds.filter((s) => s.source === seed.source)
      const seedsByRichness = seedsBySource.sort(
        (a, b) =>
          state.cells[b.target!].richness - state.cells[a.target!].richness
      )

      // Richest seed must not be unusable
      let richestSeed = seedsByRichness[0]
      if (state.cells[richestSeed.target!].richness !== 0) {
        return richestSeed
      }
    }
  }

  // Wait if we can't do anything else
  return state.possibleActions[0]
}

function oppositeDirectionIndex(direction: number) {
  return (direction + 3) % 6
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
