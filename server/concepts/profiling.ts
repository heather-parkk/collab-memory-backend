import { ObjectId } from "mongodb";
import DocCollection, { BaseDoc } from "../framework/doc";
import { NotFoundError } from "./errors";

export interface ProfileDoc extends BaseDoc {
  user: ObjectId;
  question: string;
  selectedChoices: string[];
}

/**
 * Concept: Profiling [User, Item]
 */
export default class ProfilingConcept {
  public readonly profiles: DocCollection<ProfileDoc>;

  private readonly profilingQuestion = "What are your goals in Fam.ly?";
  private readonly profilingOptions = ["Learn family history", "Connect more often", "Learn others' interests", "Learn about identity"];

  constructor(collectionName: string) {
    this.profiles = new DocCollection<ProfileDoc>(collectionName);
  }

  /**
   * Ask the predefined question and record the user's selected responses.
   * @param user - The ID of the user.
   * @param selectedChoices - The choices selected by the user.
   */
  async ask(user: ObjectId, selectedChoices?: string[]) {
    if (!selectedChoices || selectedChoices.length === 0) return;

    const invalidChoices = selectedChoices.filter((choice) => !this.profilingOptions.includes(choice));
    if (invalidChoices.length > 0) {
      throw new Error(`Invalid choices: ${invalidChoices.join(", ")}`);
    }

    const existingProfile = await this.profiles.readOne({ user, question: this.profilingQuestion });
    if (existingProfile) {
      await this.profiles.updateOne({ _id: existingProfile._id }, { selectedChoices });
    } else {
      await this.profiles.createOne({
        user,
        question: this.profilingQuestion,
        selectedChoices,
      });
    }

    return { msg: "Profile updated successfully!" };
  }

  /**
   * Update the user's profiling data for the predefined question.
   * @param user - The ID of the user.
   * @param selectedChoices - The updated choices for the user.
   */
  async updateProfile(user: ObjectId, selectedChoices: string[]) {
    return this.ask(user, selectedChoices); // Reuse the ask method to perform the update.
  }

  /**
   * Retrieve a user's responses for the predefined question.
   * @param user - The ID of the user.
   * @returns The selected choices for the predefined question.
   */
  async getUserResponses(user: ObjectId) {
    const profile = await this.profiles.readOne({ user, question: this.profilingQuestion });
    if (!profile) {
      throw new ProfileNotFoundError(user, this.profilingQuestion);
    }
    return profile.selectedChoices;
  }
}

/**
 * Error for when a profile entry is not found.
 */
class ProfileNotFoundError extends NotFoundError {
  constructor(user: ObjectId, question: string) {
    super(`Profile entry for user ${user} and question "${question}" not found!`);
  }
}
