// Import necessary libraries
import { v4 as uuidv4 } from "uuid";
import { Server, StableBTreeMap, ic } from "azle";
import express from "express";

// Define the Child class to represent children
class Child {
  id: string;
  name: string;
  birthdate: Date;
  guardianId: string;
  createdAt: Date;
}

// Define the Guardian class to represent guardians
class Guardian {
  id: string;
  name: string;
  email: string;
  childrenIds: string[];
  createdAt: Date;
}

// Define the Payment class to represent payments
class Payment {
  id: string;
  childId: string;
  amount: number;
  date: Date;
}

// Initialize stable maps for storing children and guardians
const childrenStorage = StableBTreeMap<string, Child>(0);
const guardiansStorage = StableBTreeMap<string, Guardian>(1);

// Initialize a stable map for storing payments
const paymentsStorage = StableBTreeMap<string, Payment>(2);

// Define the express server
export default Server(() => {
  const app = express();
  app.use(express.json());

  // Define the endpoint to create a child
  app.post("/children", (req, res) => {
    const { name, birthdate, guardianId } = req.body;
    const child: Child = {
      id: uuidv4(),
      createdAt: getCurrentDate(),
      ...req.body,
    };
    childrenStorage.insert(child.id, child);
    res.json(child);
  });

  // Start the server
  return app.listen();
});

// Function to get the current date
function getCurrentDate() {
    const timestamp = new Number(ic.time());
    return new Date(timestamp.valueOf() / 1000_000);
  }