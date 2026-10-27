/** A recipe as the coach needs it: what to cook, with what, in what order. */
export type CoachRecipe = {
  title: string;
  ingredients: { amount: string; item: string }[];
  steps: string[];
};

/** Everything a pack may draw on to frame one question. */
export type PackContext = {
  recipe: CoachRecipe;
  stepIndex: number;
  utterance: string;
  /** What the coach has noted going in so far this step. */
  seen: string[];
  /** The ingredients that belong to the current step (step–ingredient linking). */
  stepIngredients: string[];
  /** Whether frames came with this question; without them the coach must not describe what it "sees". */
  hasPhotos: boolean;
  /** How to judge the current step, written when the session started (empty strings when planning failed). */
  briefing: { done: string; mistakes: string; tip: string };
  /** The conversation so far, oldest first. */
  history: { who: "cook" | "coach"; text: string }[];
};

/**
 * The expertise slot: what the coach knows and how it behaves in one domain. Cooking is the first; carpentry or
 * plumbing would be another pack behind the same two functions.
 */
export interface ExpertisePack {
  id: string;
  system(ctx: PackContext): string;
  user(ctx: PackContext): string;
}
