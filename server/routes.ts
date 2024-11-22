import { ObjectId } from "mongodb";

import { Router, getExpressRouter } from "./framework/router";

import { Authing, Posting, Profiling, Sessioning } from "./app";
import { PostOptions } from "./concepts/posting";
import { SessionDoc } from "./concepts/sessioning";
import Responses from "./responses";

import { z } from "zod";

/**
 * Web server routes for the app. Implements synchronizations between concepts.
 */
class Routes {
  // Profiling question and options
  private readonly profilingQuestion = "What are your goals in Fam.ly?";
  private readonly profilingOptions = ["Learn family history", "Connect more often", "Learn others' interests", "Learn about identity"];

  @Router.get("/session")
  async getSessionUser(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    return await Authing.getUserById(user);
  }

  @Router.get("/users")
  async getUsers() {
    return await Authing.getUsers();
  }

  @Router.get("/users/:username")
  @Router.validate(z.object({ username: z.string().min(1) }))
  async getUser(username: string) {
    return await Authing.getUserByUsername(username);
  }

  @Router.post("/users")
  @Router.validate(
    z.object({
      username: z.string().min(1),
      password: z.string().min(1),
      profileResponses: z.array(z.string()).optional(), // Optional profiling responses
    }),
  )
  async createUser(
    session: SessionDoc,
    username: string,
    password: string,
    profileResponses?: string[], // Optional responses
  ) {
    Sessioning.isLoggedOut(session);

    // Create the user
    const result = await Authing.create(username, password);
    const user = result.user;

    if (!user) {
      throw new Error("User creation failed.");
    }

    // Add profiling responses if provided
    if (profileResponses && profileResponses.length > 0) {
      const invalidChoices = profileResponses.filter((choice) => !this.profilingOptions.includes(choice));
      if (invalidChoices.length > 0) {
        throw new Error(`Invalid choices: ${invalidChoices.join(", ")}`);
      }
      await Profiling.ask(user._id, profileResponses);
    }

    return { msg: "User created successfully!", user };
  }

  @Router.patch("/users/username")
  async updateUsername(session: SessionDoc, username: string) {
    const user = Sessioning.getUser(session);
    return await Authing.updateUsername(user, username);
  }

  @Router.patch("/users/password")
  async updatePassword(session: SessionDoc, currentPassword: string, newPassword: string) {
    const user = Sessioning.getUser(session);
    return Authing.updatePassword(user, currentPassword, newPassword);
  }

  @Router.delete("/users")
  async deleteUser(session: SessionDoc) {
    const user = Sessioning.getUser(session);
    Sessioning.end(session);
    return await Authing.delete(user);
  }

  @Router.post("/login")
  async logIn(session: SessionDoc, username: string, password: string) {
    const u = await Authing.authenticate(username, password);
    Sessioning.start(session, u._id);
    return { msg: "Logged in!" };
  }

  @Router.post("/logout")
  async logOut(session: SessionDoc) {
    Sessioning.end(session);
    return { msg: "Logged out!" };
  }

  /**
   * Profile Update: Update the profiling responses for a user.
   */
  @Router.patch("/profile")
  @Router.validate(
    z.object({
      selectedChoices: z.array(z.string()),
    }),
  )
  async updateProfile(session: SessionDoc, selectedChoices: string[]) {
    const userId = Sessioning.getUser(session);

    const invalidChoices = selectedChoices.filter((choice) => !this.profilingOptions.includes(choice));
    if (invalidChoices.length > 0) {
      throw new Error(`Invalid choices: ${invalidChoices.join(", ")}`);
    }

    await Profiling.updateProfile(userId, selectedChoices);

    return { msg: "Profile updated successfully!" };
  }

  @Router.get("/posts")
  @Router.validate(z.object({ author: z.string().optional() }))
  async getPosts(author?: string) {
    let posts;
    if (author) {
      const id = (await Authing.getUserByUsername(author))._id;
      posts = await Posting.getByAuthor(id);
    } else {
      posts = await Posting.getPosts();
    }
    return Responses.posts(posts);
  }

  @Router.post("/posts")
  async createPost(session: SessionDoc, content: string, options?: PostOptions) {
    const user = Sessioning.getUser(session);
    const created = await Posting.create(user, content, options);
    return { msg: created.msg, post: await Responses.post(created.post) };
  }

  @Router.patch("/posts/:id")
  async updatePost(session: SessionDoc, id: string, content?: string, options?: PostOptions) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Posting.assertAuthorIsUser(oid, user);
    return await Posting.update(oid, content, options);
  }

  @Router.delete("/posts/:id")
  async deletePost(session: SessionDoc, id: string) {
    const user = Sessioning.getUser(session);
    const oid = new ObjectId(id);
    await Posting.assertAuthorIsUser(oid, user);
    return Posting.delete(oid);
  }
}

/** The web app. */
export const app = new Routes();

/** The Express router. */
export const appRouter = getExpressRouter(app);
