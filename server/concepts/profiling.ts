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

  /**
   * Create an instance of Profiling.
   * @param collectionName - Name of the MongoDB collection.
   */
  constructor(collectionName: string) {
    this.profiles = new DocCollection<ProfileDoc>(collectionName);
  }

  /**
   * Ask a question and record the user's selected responses.
   * @param user - The ID of the user.
   * @param question - The question being asked.
   * @param selected - The choices selected by the user.
   */
  async ask(user: ObjectId, question: string, selected: string[]) {
    // Update or create the profile entry.
    const existingProfile = await this.profiles.readOne({ user, question });
    if (existingProfile) {
      await this.profiles.updateOne({ _id: existingProfile._id }, { selectedChoices: selected });
    } else {
      await this.profiles.createOne({
        user,
        question,
        selectedChoices: selected,
      });
    }

    return { msg: "Profile updated successfully!" };
  }

  /**
   * Update the user's profile with specific responses.
   * @param user - The ID of the user.
   * @param question - The question being updated.
   * @param responses - The new responses to update.
   */
  async updateProfile(user: ObjectId, question: string, responses: string[]) {
    const profile = await this.profiles.readOne({ user, question });
    if (!profile) {
      throw new ProfileNotFoundError(user, question);
    }
    await this.profiles.updateOne({ _id: profile._id }, { selectedChoices: responses });
    return { msg: "Profile updated successfully!" };
  }

  /**
   * Retrieve a user's responses for a given question.
   * @param user - The ID of the user.
   * @param question - The question for which responses are being retrieved.
   * @returns The selected choices for the given question.
   */
  async getUserResponses(user: ObjectId, question: string) {
    const profile = await this.profiles.readOne({ user, question });
    if (!profile) {
      throw new ProfileNotFoundError(user, question);
    }
    return profile.selectedChoices;
  }
}

/**
 * Error for when a profile entry is not found.
 */
export class ProfileNotFoundError extends NotFoundError {
  constructor(
    public readonly user: ObjectId,
    public readonly question: string,
  ) {
    super("Profile entry for user {0} and question {1} not found!", user, question);
  }
}
