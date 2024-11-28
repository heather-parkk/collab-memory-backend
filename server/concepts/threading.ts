import { ObjectId } from "mongodb";

import DocCollection, { BaseDoc } from "../framework/doc";
import { NotAllowedError, NotFoundError } from "./errors";

export interface ThreadDoc extends BaseDoc {
  creator: ObjectId;
  title: string;
  members: Array<ObjectId>;
  content: Array<ObjectId>;
}

/**
 * concept: Threading [User, Post, Collection, Date]
 */
export default class ThreadingConcept {
  public readonly threads: DocCollection<ThreadDoc>;

  /**
   * Make an instance of Threading.
   */
  constructor(collectionName: string) {
    this.threads = new DocCollection<ThreadDoc>(collectionName);
  }

  //creates new thread
  async createThread(creator: ObjectId, title: string, origContent: Array<ObjectId>, origMembers: Array<ObjectId>) {
    let content: Array<ObjectId>;
    let members: Array<ObjectId>;
    if (!origContent) {
      content = [];
    } else {
      content = [...origContent];
    }
    if (!origMembers) {
      members = [];
    } else {
      members = [...origMembers];
    }
    const _id = await this.threads.createOne({ creator, title, members, content });
    return { msg: "Thread successfully created!", thread: await this.threads.readOne({ _id }) };
  }

  // Returns all posts in thread
  async getThreadContent(_id: ObjectId) {
    const thread = await this.threads.readOne({ _id });
    const content: Array<ObjectId> = [];
    if (thread) {
      for (const p of thread.content) {
        content.push(p);
      }
    }
    return { msg: "Thread content retrieved!", content: content };
  }

  // Edit thread title
  async editThreadTitle(_id: ObjectId, title: string) {
    await this.threads.partialUpdateOne({ _id }, { title });
    return { msg: "Thread title successfully updated!" };
  }

  // Delete thread
  async deleteThread(_id: ObjectId) {
    await this.threads.deleteOne({ _id });
    return { msg: "Thread deleted successfully!" };
  }

  // Add item to thread
  async addToThread(_id: ObjectId, itemId: ObjectId) {
    const thread = await this.threads.readOne({ _id });
    if (thread != null && !thread.content.includes(itemId)) {
      thread.content.push(itemId);
      await this.threads.partialUpdateOne({ _id }, { content: thread.content });
      return { msg: "Post added to thread!" };
    }
    return { msg: "Post unable to be added to thread!" };
  }

  // Remove post from thread
  async removeFromThread(_id: ObjectId, itemId: ObjectId) {
    const thread = await this.threads.readOne({ _id });
    console.log(thread);
    console.log(itemId);
    if (thread != null && thread.content.includes(itemId)) {
      thread.content = thread.content.filter((id) => id.toString() !== itemId.toString());
      console.log("t", thread.content);
      await this.threads.partialUpdateOne({ _id }, { content: thread.content });
      return { msg: "Post remove from thread!" };
    }
    return { msg: "Post unable to be removed from thread!" };
  }

  // Join thread (add error if try to join thread already did)
  async joinThread(_id: ObjectId, itemId: ObjectId) {
    const thread = await this.threads.readOne({ _id });
    console.log(thread);
    if (thread != null && !thread.content.includes(itemId)) {
      thread.members.push(itemId);
      await this.threads.partialUpdateOne({ _id }, { members: thread.members });
      return { msg: "User successfully joined thread!" };
    }
    return { msg: "User unable to join thread!" };
  }

  // Leave thread
  async leaveThread(_id: ObjectId, itemId: ObjectId) {
    const thread = await this.threads.readOne({ _id });
    if (thread != null && !thread.members.includes(itemId)) {
      thread.members = thread.members.filter((member) => !member.equals(itemId));
      await this.threads.partialUpdateOne({ _id }, { members: thread.members });
      return { msg: "User successfully left thread!" };
    }
    return { msg: "User unable to leave thread!" };
  }

  async assertCreatorIsUser(_id: ObjectId, user: ObjectId) {
    const thread = await this.threads.readOne({ _id });
    if (!thread) {
      throw new NotFoundError(`Thread ${_id} does not exist!`);
    }
    if (thread.creator.toString() !== user.toString()) {
      throw new ThreadCreatorNotMatchError(user, _id);
    }
  }
}

export class ThreadCreatorNotMatchError extends NotAllowedError {
  constructor(
    public readonly creator: ObjectId,
    public readonly _id: ObjectId,
  ) {
    super("{0} is not the author of post {1}!", creator, _id);
  }
}
