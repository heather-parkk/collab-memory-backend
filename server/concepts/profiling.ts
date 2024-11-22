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

  constructor(collectionName: string) {
    this.profiles = new DocCollection<ProfileDoc>(collectionName);
  }

  /**
   * Ask a question and save the user's selected responses.
   * @param user - The ID of the user.
   * @param question - The question being asked.
   * @param selectedChoices - The user's selected choices.
   */
  async ask(user: ObjectId, question: string, selectedChoices: string[]) {
    if (!question || selectedChoices.length === 0) {
      throw new Error("Question and selected choices must be provided.");
    }

    const existingProfile = await this.profiles.readOne({ user, question });
    if (existingProfile) {
      await this.profiles.updateOne({ _id: existingProfile._id }, { selectedChoices });
    } else {
      await this.profiles.createOne({
        user,
        question,
        selectedChoices,
      });
    }

    return { msg: "Profile updated successfully!" };
  }

  /**
   * Update the user's profiling data for a specific question.
   * @param user - The ID of the user.
   * @param question - The question to update responses for.
   * @param selectedChoices - The updated responses for the question.
   */
  async updateProfile(user: ObjectId, question: string, selectedChoices: string[]) {
    return this.ask(user, question, selectedChoices); // Reuse the ask method to perform the update.
  }

  /**
   * Retrieve a user's response to a specific question.
   * @param user - The ID of the user.
   * @param question - The question to retrieve responses for.
   * @returns The user's selected choices for the question.
   */
  async getUserResponses(user: ObjectId, question: string) {
    const profile = await this.profiles.readOne({ user, question });
    if (!profile) {
      throw new ProfileNotFoundError(user, question);
    }
    return profile.selectedChoices;
  }

  /**
   * Retrieve all responses for a user.
   * @param user - The ID of the user.
   * @returns An array of all questions and their corresponding responses for the user.
   */
  async getAllResponses(user: ObjectId) {
    return await this.profiles.readMany({ user });
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
