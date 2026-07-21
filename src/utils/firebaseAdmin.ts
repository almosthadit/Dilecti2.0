import { initializeApp } from 'firebase/app';
import { getFirestore, doc, collection, getDoc, getDocs, collectionGroup, query, where, limit, writeBatch, setDoc, deleteDoc } from 'firebase/firestore';
import * as fs from 'fs';

let config: any = {};
try {
  config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
} catch (e) {
  config = { firestoreDatabaseId: 'ai-studio-45a4f1a0-b66b-4671-95c5-d50c1f8384a3', projectId: "gen-lang-client-0481846593" };
}

const app = initializeApp(config, "serverApp");
export const db = getFirestore(app, config.firestoreDatabaseId);

class DocRefShim {
  path: string;
  id: string;
  constructor(path: string) {
    this.path = path;
    this.id = path.split('/').pop() || '';
  }
  async get() {
    const snap = await getDoc(doc(db, this.path));
    return {
      exists: snap.exists(),
      id: snap.id,
      data: () => snap.data()
    };
  }
  collection(subPath: string) {
    return new CollectionShim(this.path + '/' + subPath);
  }
  async set(data: any, options?: any) {
    return setDoc(doc(db, this.path), data, options);
  }
  async delete() {
    return deleteDoc(doc(db, this.path));
  }
}

class QueryShim {
  q: any;
  constructor(q: any) { this.q = q; }
  where(field: string, op: any, val: any) {
    return new QueryShim(query(this.q, where(field, op, val)));
  }
  limit(n: number) {
    return new QueryShim(query(this.q, limit(n)));
  }
  async get() {
    const snap = await getDocs(this.q);
    const docs = snap.docs.map(d => ({
        id: d.id,
        data: () => d.data(),
        ref: { path: d.ref.path, set: (data, opts) => setDoc(doc(db, d.ref.path), data, opts) }
    }));
    return {
      size: snap.size,
      docs,
      forEach: (cb: any) => docs.forEach(cb)
    };
  }
}

class CollectionShim {
  path: string;
  constructor(path: string) { this.path = path; }
  doc(id?: string) {
    return new DocRefShim(id ? `${this.path}/${id}` : `${this.path}/temp_${Date.now()}`);
  }
  where(field: string, op: any, val: any) {
    return new QueryShim(query(collection(db, this.path), where(field, op, val)));
  }
  limit(n: number) {
    return new QueryShim(query(collection(db, this.path), limit(n)));
  }
  async get() {
    const snap = await getDocs(collection(db, this.path));
    const docs = snap.docs.map(d => ({
        id: d.id,
        data: () => d.data(),
        ref: { path: d.ref.path, set: (data, opts) => setDoc(doc(db, d.ref.path), data, opts) }
    }));
    return {
      size: snap.size,
      docs,
      forEach: (cb: any) => docs.forEach(cb)
    };
  }
}

export const adminDb = {
  collection: (path: string) => new CollectionShim(path),
  collectionGroup: (path: string) => new QueryShim(collectionGroup(db, path)),
  batch: () => {
    const b = writeBatch(db);
    return {
      set: (ref: DocRefShim, data: any, options?: any) => {
        b.set(doc(db, ref.path), data, options);
      },
      commit: () => b.commit()
    };
  }
};
