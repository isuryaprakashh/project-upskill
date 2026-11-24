import { MongoClient, ObjectId } from 'mongodb';
import type { Collection, Db } from 'mongodb';
import { emptyProgress } from './types.js';
import type { Hackathon, Job, NewHackathon, NewJob, Progress, ProgressData, Store, User } from './types.js';

type UserDoc = Omit<User, 'id'> & { _id: ObjectId };
type ProgressDoc = Omit<Progress, 'userId'> & { _id: string };
type JobDoc = Omit<Job, 'id'> & { _id: ObjectId };
type HackDoc = Omit<Hackathon, 'id'> & { _id: ObjectId };

const oid = (id: string) => (ObjectId.isValid(id) ? new ObjectId(id) : null);

export class MongoStore implements Store {
  private users: Collection<UserDoc>;
  private progress: Collection<ProgressDoc>;
  private jobs: Collection<JobDoc>;
  private hacks: Collection<HackDoc>;

  private constructor(private client: MongoClient, db: Db) {
    this.users = db.collection<UserDoc>('users');
    this.progress = db.collection<ProgressDoc>('progress');
    this.jobs = db.collection<JobDoc>('jobs');
    this.hacks = db.collection<HackDoc>('hackathons');
  }

  static async connect(uri: string, dbName: string) {
    const client = new MongoClient(uri);
    await client.connect();
    const store = new MongoStore(client, client.db(dbName));
    await store.users.createIndex({ email: 1 }, { unique: true });
    await store.jobs.createIndex({ userId: 1, updatedAt: -1 });
    await store.hacks.createIndex({ userId: 1, deadline: 1 });
    return store;
  }

  async close() {
    await this.client.close();
  }

  private user(d: UserDoc | null): User | null {
    if (!d) return null;
    const { _id, ...rest } = d;
    return { ...rest, id: _id.toHexString() };
  }

  async createUser(u: Omit<User, 'id'>) {
    try {
      const r = await this.users.insertOne({ ...u, _id: new ObjectId() });
      return { ...u, id: r.insertedId.toHexString() };
    } catch (e: unknown) {
      if (typeof e === 'object' && e !== null && (e as { code?: number }).code === 11000) return null; // duplicate email
      throw e;
    }
  }
  async findUserByEmail(email: string) {
    return this.user(await this.users.findOne({ email }));
  }
  async findUserById(id: string) {
    const _id = oid(id);
    return _id ? this.user(await this.users.findOne({ _id })) : null;
  }
  async bumpTokenVersion(id: string) {
    const _id = oid(id);
    if (_id) await this.users.updateOne({ _id }, { $inc: { tokenVersion: 1 } });
  }

  async getProgress(userId: string): Promise<Progress> {
    const d = await this.progress.findOne({ _id: userId });
    if (!d) return { userId, version: 0, data: emptyProgress(), updatedAt: new Date(0).toISOString() };
    return { userId, version: d.version, data: d.data, updatedAt: d.updatedAt };
  }
  async saveProgress(userId: string, data: ProgressData, expectedVersion: number) {
    const updatedAt = new Date().toISOString();
    if (expectedVersion === 0) {
      try {
        await this.progress.insertOne({ _id: userId, version: 1, data, updatedAt });
        return { userId, version: 1, data, updatedAt };
      } catch (e: unknown) {
        if (typeof e === 'object' && e !== null && (e as { code?: number }).code === 11000) return null;
        throw e;
      }
    }
    // Only write if nobody else saved in between (optimistic locking).
    const r = await this.progress.updateOne({ _id: userId, version: expectedVersion }, { $set: { data, updatedAt }, $inc: { version: 1 } });
    if (r.matchedCount === 0) return null;
    return { userId, version: expectedVersion + 1, data, updatedAt };
  }

  private job(d: JobDoc): Job {
    const { _id, ...rest } = d;
    return { ...rest, id: _id.toHexString() };
  }
  async listJobs(userId: string) {
    return (await this.jobs.find({ userId }).sort({ updatedAt: -1 }).toArray()).map((d) => this.job(d));
  }
  async createJob(userId: string, j: NewJob) {
    const doc: JobDoc = { ...j, _id: new ObjectId(), userId, updatedAt: new Date().toISOString() };
    await this.jobs.insertOne(doc);
    return this.job(doc);
  }
  async updateJob(userId: string, id: string, j: NewJob) {
    const _id = oid(id);
    if (!_id) return null;
    const d = await this.jobs.findOneAndUpdate({ _id, userId }, { $set: { ...j, updatedAt: new Date().toISOString() } }, { returnDocument: 'after' });
    return d ? this.job(d) : null;
  }
  async deleteJob(userId: string, id: string) {
    const _id = oid(id);
    if (!_id) return false;
    return (await this.jobs.deleteOne({ _id, userId })).deletedCount === 1;
  }

  private hack(d: HackDoc): Hackathon {
    const { _id, ...rest } = d;
    return { ...rest, id: _id.toHexString() };
  }
  async listHackathons(userId: string) {
    return (await this.hacks.find({ userId }).sort({ deadline: 1 }).toArray()).map((d) => this.hack(d));
  }
  async createHackathon(userId: string, h: NewHackathon) {
    const doc: HackDoc = { ...h, _id: new ObjectId(), userId, updatedAt: new Date().toISOString() };
    await this.hacks.insertOne(doc);
    return this.hack(doc);
  }
  async updateHackathon(userId: string, id: string, h: NewHackathon) {
    const _id = oid(id);
    if (!_id) return null;
    const d = await this.hacks.findOneAndUpdate({ _id, userId }, { $set: { ...h, updatedAt: new Date().toISOString() } }, { returnDocument: 'after' });
    return d ? this.hack(d) : null;
  }
  async deleteHackathon(userId: string, id: string) {
    const _id = oid(id);
    if (!_id) return false;
    return (await this.hacks.deleteOne({ _id, userId })).deletedCount === 1;
  }
}
