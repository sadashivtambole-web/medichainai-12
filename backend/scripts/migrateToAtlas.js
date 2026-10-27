import dns from "dns";
import mongoose from "mongoose";

// Set DNS servers for Atlas SRV resolution
try {
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {}

const LOCAL_URI = "mongodb://127.0.0.1:27017/medichain_ai";
const ATLAS_URI = "mongodb+srv://tambuleganesh_db_user:dOckmCtO1fFRmtDt@cluster0.cxtebif.mongodb.net/medichain_ai?retryWrites=true&w=majority";

async function migrate() {
  console.log("Connecting to source Local MongoDB Compass...");
  const localConn = await mongoose.createConnection(LOCAL_URI, {
    serverSelectionTimeoutMS: 10000,
  }).asPromise();
  console.log("Connected to Local MongoDB.");

  console.log("Connecting to target MongoDB Atlas...");
  const atlasConn = await mongoose.createConnection(ATLAS_URI, {
    serverSelectionTimeoutMS: 15000,
  }).asPromise();
  console.log("Connected to MongoDB Atlas.");

  const collections = await localConn.db.listCollections().toArray();
  console.log(`Found ${collections.length} collections in local MongoDB.`);

  for (const colInfo of collections) {
    const colName = colInfo.name;
    if (colName.startsWith("system.")) continue;

    const localCol = localConn.db.collection(colName);
    const atlasCol = atlasConn.db.collection(colName);

    const docs = await localCol.find({}).toArray();
    console.log(`Collection [${colName}]: ${docs.length} documents.`);

    if (docs.length > 0) {
      // Clear target collection first to avoid duplicate key errors
      await atlasCol.deleteMany({});
      const result = await atlasCol.insertMany(docs);
      console.log(`Migrated ${result.insertedCount} documents to Atlas [${colName}].`);
    }
  }

  console.log("\nAll data migrated successfully from Local MongoDB to MongoDB Atlas!");
  await localConn.close();
  await atlasConn.close();
  process.exit(0);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
