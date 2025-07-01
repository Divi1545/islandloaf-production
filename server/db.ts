import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Get database URL from environment variables
const uri = process.env.DATABASE_URL || "mongodb+srv://alcodeagency:AiKiZd5vzUeiOliZi@islandloaf0.f6gf5t.mongodb.net/?retryWrites=true&w=majority";

const client = new MongoClient(uri, {
  minPoolSize: 0,
  maxPoolSize: 10,
  retryWrites: true,
  retryReads: true,
  maxIdleTimeMS: 120000,
  connectTimeoutMS: 10000,
  serverSelectionTimeoutMS: 10000,
});

export async function connectDB() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB Atlas");
    return client.db("islandloaf");
  } catch (error) {
    console.error("❌ Error connecting to MongoDB:", error);
    // In development, fall back to memory storage
    if (process.env.NODE_ENV === 'development') {
      console.log("🔄 Falling back to memory storage for development");
      return null;
    }
    throw error;
  }
}

export const db = client.db("islandloaf");

// Graceful shutdown
process.on('SIGINT', async () => {
  try {
    await client.close();
    console.log('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error closing MongoDB connection:', error);
    process.exit(1);
  }
});
