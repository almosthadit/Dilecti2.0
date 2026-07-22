import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";
import { db } from "../db/index.js";
import { globalItems } from "../db/schema.js";
import { sql } from "drizzle-orm";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { Storage } from "@google-cloud/storage";

export const adminRouter = Router();

const GCS_BUCKET_NAME = "gen-lang-client-0481846593.firebasestorage.app";

async function uploadToGCS(filename: string, content: string): Promise<string> {
  const storage = new Storage();
  const bucket = storage.bucket(GCS_BUCKET_NAME);
  const destination = `backups/${new Date().toISOString().replace(/:/g, "-")}_${filename}`;
  const file = bucket.file(destination);

  await file.save(content, {
    contentType: "application/json",
    resumable: false,
  });

  return `gs://${GCS_BUCKET_NAME}/${destination}`;
}

const dummyQuery = sql`
  SELECT id, title, category 
  FROM global_items 
  WHERE id LIKE '%-repaired-item-%'
    AND subtitle = 'Repaired item to satisfy seed constraints'
    AND description LIKE 'This is a recovered item for the % category.'
`;

adminRouter.post("/api/admin/seed-import-dryrun", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.email !== 'justinplappert@gmail.com' || !req.user.email_verified) {
      return res.status(403).json({ error: "Forbidden: Admin access only" });
    }

    // 1. Connection check

    const dbTest = await db.execute(sql`SELECT 1 as test`);
    if (dbTest.rows.length === 0) throw new Error("Connection test returned no rows.");
    const initialRowsQuery = await db.execute(sql`SELECT count(*) FROM global_items`);
    const initialRows = initialRowsQuery.rows[0].count;

    // 2. Dummy check
    const dummyRecords = await db.execute(dummyQuery);
    
    // 3. Zip file parsing
    const zipPath = path.join(process.cwd(), "dilecti_9202_plus_upcoming_releases_seed_pack.zip");
    if (!fs.existsSync(zipPath)) {
      return res.status(400).json({ error: "Seed zip file not found on server." });
    }

    const zip = new AdmZip(zipPath);
    const manifestEntry = zip.getEntry("manifest.json");
    if (!manifestEntry) throw new Error("manifest.json missing from zip.");

    const manifest = JSON.parse(zip.readAsText(manifestEntry));
    if (manifest.combinedItems !== 9490) {
      throw new Error(`Manifest combinedItems is ${manifest.combinedItems}, expected exactly 9490.`);
    }

    const extractedDir = path.join(process.cwd(), "extracted_seed_pack_temp");
    if (!fs.existsSync(extractedDir)) {
      zip.extractAllTo(extractedDir, true);
    }

    const importDirs = ["import_chunks_100", "upcoming_releases_chunks_100"];
    const allIncomingItems: any[] = [];
    const seenIds = new Set();
    let baseItemsParsed = 0;
    let upcomingItemsParsed = 0;
    let hasDuplicates = false;

    for (const dir of importDirs) {
      const fullDir = path.join(extractedDir, dir);
      if (!fs.existsSync(fullDir)) continue;

      const files = fs.readdirSync(fullDir).filter((f) => f.endsWith(".json"));
      for (const file of files) {
        const content = fs.readFileSync(path.join(fullDir, file), "utf-8");
        let items = JSON.parse(content);
        if (!Array.isArray(items)) items = items.items || [items];

        for (const item of items) {
          if (seenIds.has(item.id)) hasDuplicates = true;
          seenIds.add(item.id);
          item._sourceProvenance = dir === "import_chunks_100" ? "canonical_base_seed" : "upcoming_release_seed";
          allIncomingItems.push(item);
          if (dir === "import_chunks_100") baseItemsParsed++;
          if (dir === "upcoming_releases_chunks_100") upcomingItemsParsed++;
        }
      }
    }

    if (allIncomingItems.length !== 9490) throw new Error(`Parsed total ${allIncomingItems.length}, expected 9490.`);
    if (hasDuplicates) throw new Error("Duplicate IDs found in archive.");

    const existingIdsInDb = new Set();
    for (let i = 0; i < allIncomingItems.length; i += 1000) {
      const batchIds = allIncomingItems.slice(i, i + 1000).map((item) => item.id);
      const idList = batchIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(",");
      const existRes = await db.execute(sql.raw(`SELECT id FROM global_items WHERE id IN (${idList})`));
      existRes.rows.forEach((r) => existingIdsInDb.add(r.id));
    }

    return res.json({
      success: true,
      initialRows,
      baseItemsParsed,
      upcomingItemsParsed,
      existingCount: existingIdsInDb.size,
      missingCount: allIncomingItems.length - existingIdsInDb.size,
      dummyRowsToDelete: dummyRecords.rows,
      backupDestination: `gs://${GCS_BUCKET_NAME}/backups/`,
      validationStatus: "Passed: All 9490 unique IDs present in Zip."
    });

  } catch (error: any) {
    console.error("Dry run error:", error);
    return res.status(500).json({ error: error.message || "Unknown error" });
  }
});


adminRouter.post("/api/admin/seed-import-apply", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user || req.user.email !== 'justinplappert@gmail.com' || !req.user.email_verified) {
      return res.status(403).json({ error: "Forbidden: Admin access only" });
    }

    const dummyRecords = await db.execute(dummyQuery);
    
    // GCS Backup for Dummies
    if (dummyRecords.rows.length > 0) {
      const dummyBackupContent = JSON.stringify(dummyRecords.rows, null, 2);
      await uploadToGCS("backup_deleted_dummies.json", dummyBackupContent);
      await db.execute(dummyQuery);
      
      await db.execute(sql`
        DELETE FROM global_items 
        WHERE id LIKE '%-repaired-item-%'
          AND subtitle = 'Repaired item to satisfy seed constraints'
          AND description LIKE 'This is a recovered item for the % category.'
      `);
    }

    const zipPath = path.join(process.cwd(), "dilecti_9202_plus_upcoming_releases_seed_pack.zip");
    const zip = new AdmZip(zipPath);
    const extractedDir = path.join(process.cwd(), "extracted_seed_pack_temp");
    if (!fs.existsSync(extractedDir)) zip.extractAllTo(extractedDir, true);

    const importDirs = ["import_chunks_100", "upcoming_releases_chunks_100"];
    const allIncomingItems: any[] = [];
    const seenIds = new Set<string>();

    for (const dir of importDirs) {
      const fullDir = path.join(extractedDir, dir);
      if (!fs.existsSync(fullDir)) continue;
      const files = fs.readdirSync(fullDir).filter((f) => f.endsWith(".json"));
      for (const file of files) {
        const content = fs.readFileSync(path.join(fullDir, file), "utf-8");
        let items = JSON.parse(content);
        if (!Array.isArray(items)) items = items.items || [items];
        for (const item of items) {
          seenIds.add(item.id);
          item._sourceProvenance = dir === "import_chunks_100" ? "canonical_base_seed" : "upcoming_release_seed";
          allIncomingItems.push(item);
        }
      }
    }

    // Existing IDs backup
    const existingToBackup: any[] = [];
    for (let i = 0; i < allIncomingItems.length; i += 1000) {
      const batchIds = allIncomingItems.slice(i, i + 1000).map((item) => item.id);
      const idList = batchIds.map((id) => `'${id.replace(/'/g, "''")}'`).join(",");
      const existRes = await db.execute(sql.raw(`SELECT * FROM global_items WHERE id IN (${idList})`));
      existRes.rows.forEach((r) => existingToBackup.push(r));
    }
    
    if (existingToBackup.length > 0) {
      await uploadToGCS("backup_updated_existing.json", JSON.stringify(existingToBackup, null, 2));
    }

    let totalInserted = 0;
    let failedRecords = 0;
    const BATCH_SIZE = 50;

    for (let i = 0; i < allIncomingItems.length; i += BATCH_SIZE) {
      const batchItems = allIncomingItems.slice(i, i + BATCH_SIZE);
      const dbRecords = batchItems.map((item) => ({
        id: item.id,
        title: item.title,
        subtitle: item.subtitle || "",
        description: item.description || "",
        category: item.category,
        data: item,
      }));

      try {
        await db.transaction(async (tx) => {
          await tx.insert(globalItems)
            .values(dbRecords)
            .onConflictDoUpdate({
              target: globalItems.id,
              set: {
                title: sql`COALESCE(NULLIF(EXCLUDED.title, ''), global_items.title)`,
                subtitle: sql`COALESCE(NULLIF(EXCLUDED.subtitle, ''), global_items.subtitle)`,
                description: sql`COALESCE(NULLIF(EXCLUDED.description, ''), global_items.description)`,
                category: sql`EXCLUDED.category`,
                data: sql`EXCLUDED.data`,
              },
            });
        });
        totalInserted += dbRecords.length;
      } catch (e) {
        failedRecords += dbRecords.length;
      }
    }

    // Reconciliation
    const remainingDummies = await db.execute(dummyQuery);
    const idListForCounts = Array.from(seenIds).map((id) => `'${id.replace(/'/g, "''")}'`).join(",");
    const postCatCounts = await db.execute(sql.raw(`
      SELECT category, count(*) FROM global_items 
      WHERE id IN (${idListForCounts})
      GROUP BY category
    `));

    let reconciledCount = 0;
    const catMap: Record<string, number> = {};
    postCatCounts.rows.forEach((r) => {
      reconciledCount += Number(r.count);
      catMap[r.category as string] = Number(r.count);
    });

    fs.rmSync(extractedDir, { recursive: true, force: true });

    return res.json({
      success: true,
      importedCount: totalInserted,
      updatedCount: existingToBackup.length,
      deletedDummyCount: dummyRecords.rows.length,
      failedCount: failedRecords,
      missingAttachedIds: 9490 - reconciledCount,
      duplicateCount: 0,
      categoryReconciliation: catMap,
      zeroRemainingDummies: remainingDummies.rows.length === 0
    });

  } catch (error: any) {
    console.error("Apply run error:", error);
    return res.status(500).json({ error: error.message || "Unknown error" });
  }
});
