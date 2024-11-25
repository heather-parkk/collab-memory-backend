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
    const content = [...origContent];
    const members = [...origMembers];
    const _id = await this.threads.createOne({ creator, title, members, content });
    return { msg: "Thread successfully created!", thread: await this.threads.readOne({ _id }) };
  }

  // Returns all posts in thread
  async getThreadPosts(_id: ObjectId) {
    const thread = await this.threads.readOne({ _id });
    const posts: Array<ObjectId> = [];
    if (thread && thread.content != null) {
      for (const p of thread.content) {
        posts.push(p);
      }
    }
    return { msg: "Thread posts retrieved!", threads: await this.threads.readMany({ _id }) };
  }

  async editThreadTitle(_id: ObjectId, title: string) {
    await this.threads.partialUpdateOne({ _id }, { title });
    return { msg: "Thread title successfully updated!" };
  }

  async deleteThread(_id: ObjectId) {
    await this.threads.deleteOne({ _id });
    return { msg: "Thread deleted successfully!" };
  }

  // Add item to thread
  async addToThread(_id: ObjectId) {
    const thread = await this.threads.readOne({ _id });
    thread?.content.push(_id);
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
