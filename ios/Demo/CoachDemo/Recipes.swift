import CoachKit

/// The demo's built-in dishes: the drill sandwich, his own boule, and two quick lunches for test cooks.
enum Recipes {
  static let all = [pbj, tuna, eggs, boule]

  /// The drill (2026-10-29): a minute, pennies, no stove — cooked over and over until the coach gets it right.
  static let pbj = CoachRecipe(
    title: "Peanut Butter and Jelly Sandwich",
    ingredients: [
      .init(amount: "2 slices", item: "bread"), .init(amount: "2 tbsp", item: "peanut butter"),
      .init(amount: "1 tbsp", item: "jelly or jam"),
    ],
    steps: [
      "Lay two slices of bread side by side on a plate.",
      "Spread the peanut butter on one slice, right to the edges.",
      "Spread the jelly on the other slice.",
      "Press the two slices together, spreads facing in.",
      "Cut the sandwich in half.",
    ])

  /// His quick lunch, in his steps (2026-10-27).
  static let tuna = CoachRecipe(
    title: "Quick Tuna Salad",
    ingredients: [
      .init(amount: "1 can", item: "tuna"), .init(amount: "2 tbsp", item: "mayo"),
      .init(amount: "2", item: "pickles"), .init(amount: "1 tbsp", item: "pickled onions"),
      .init(amount: "1 pinch", item: "salt"), .init(amount: "1 pinch", item: "pepper"),
    ],
    steps: [
      "Open the can of tuna, press the lid down and drain off all the water.",
      "Put the tuna into a bowl.",
      "Mix in the mayo.",
      "Chop the pickles and the pickled onions and mix them in.",
      "Season with salt and pepper and mix it all together.",
    ])

  static let eggs = CoachRecipe(
    title: "Scrambled Eggs on Toast",
    ingredients: [
      .init(amount: "3", item: "eggs"), .init(amount: "1 tbsp", item: "butter"),
      .init(amount: "1 pinch", item: "salt"), .init(amount: "2 slices", item: "bread"),
    ],
    steps: [
      "Put the bread in the toaster.",
      "Crack the eggs into a bowl, add the salt and beat them with a fork.",
      "Melt the butter in a pan over low heat.",
      "Pour in the eggs and stir slowly until they're just set but still glossy.",
      "Spoon the eggs onto the toast and serve straight away.",
    ])

  static let boule = CoachRecipe(
    title: "Gluten-Free Crusty Boule",
    ingredients: [
      .init(amount: "140 g", item: "brown rice flour"), .init(amount: "60 g", item: "sorghum flour"),
      .init(amount: "70 g", item: "tapioca starch"), .init(amount: "30 g", item: "potato starch"),
      .init(amount: "15 g", item: "whole psyllium husk"), .init(amount: "10 g", item: "active dry yeast"),
      .init(amount: "8 g", item: "fine sea salt"), .init(amount: "10 g", item: "honey"),
      .init(amount: "290 g", item: "warm water"), .init(amount: "35 g", item: "egg white"),
      .init(amount: "15 g", item: "olive oil"), .init(amount: "10 g", item: "apple cider vinegar"),
      .init(amount: "2 tsp", item: "rice flour, for dusting"),
    ],
    steps: [
      "Dissolve the yeast and honey in 150 g of the warm water and wait until it foams.",
      "Add the remaining 140 g of water, then whisk in the psyllium husk and vinegar; let it thicken into a gel.",
      "Whisk the brown rice flour, sorghum flour, tapioca starch, potato starch and salt together.",
      "Add the gel, egg white and olive oil; beat for 3 to 4 minutes into a stiff paste.",
      "Cover and let it rise until about one and a half times its size, 50 to 90 minutes.",
      "With wet hands, shape a round on parchment, add a foil collar and dust the top with rice flour.",
      "Bake in a lidded pot at 480°F for 28 minutes, then uncovered on the rack at 450°F for 50 minutes.",
    ])
}
