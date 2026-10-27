import CoachKit

/// His own recipe (Osito's Gluten-Free Crusty Boule), as the demo's built-in dish.
enum Recipes {
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
