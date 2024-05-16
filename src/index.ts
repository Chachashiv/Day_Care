import { v4 as uuidv4 } from "uuid";
import { Server, Variant, StableBTreeMap, ic } from "azle";
import express, { Request, Response } from "express";

// Define the Owner class to represent the owner of the daycare
class Owner {
  id: string;
  name: string;
  email: string;
  phoneNumber: string;
  createdAt: Date;
}

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
  phoneNumber: string;
  childrenIds: string[];
  createdAt: Date;
}

// Define the Payment class to represent payments
class Payment {
  id: string;
  childId: string;
  amount: number;
  status: PaymentStatus;
  date: Date;
}

// Define the PaymentStatus enum
enum PaymentStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  FAILED = "FAILED",
}

// Define the FeeStructure class to represent the fee structure or pricing plan for the daycare
class FeeStructure {
  id: string;
  name: string;
  amount: number;
  createdAt: Date;
}

// Initialize stable maps for storing children and guardians
const childrenStorage = StableBTreeMap<string, Child>(0);
const guardiansStorage = StableBTreeMap<string, Guardian>(1);

// Initialize a stable map for storing payments
const paymentsStorage = StableBTreeMap<string, Payment>(2);

// Initialize stable map for storing the owner
const ownerStorage = StableBTreeMap<string, Owner>(3);

// Initialize stable map for storing the fee structure
const feeStructureStorage = StableBTreeMap<string, FeeStructure>(4);

// Define the express server
export default Server(() => {
  const app = express();
  app.use(express.json());

  // Function to get the current date
  function getCurrentDate(): Date {
    const timestamp = new Number(ic.time());
    return new Date(timestamp.valueOf() / 1000_000);
  }

  // Function to validate email
  function validateEmail(email: string): boolean {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailPattern.test(email);
  }

  // Function to validate phone number
  function validatePhoneNumber(phoneNumber: string): boolean {
    const phonePattern = /^\d{10}$/;
    return phonePattern.test(phoneNumber);
  }

  // Define the endpoint to create an owner, the owner can only be one
  app.post("/owner", (req: Request, res: Response) => {
    const { name, email, phoneNumber } = req.body;

    // Validate the request body
    if (!name || !email || !phoneNumber) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate the phone number format
    if (!validatePhoneNumber(phoneNumber)) {
      return res.status(400).json({ message: "Invalid phone number format" });
    }

    // Validate the email format
    if (!validateEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Check if an owner already exists
    if (ownerStorage.values().length > 0) {
      return res.status(409).json({ message: "Owner already exists" });
    }

    const owner: Owner = {
      id: uuidv4(),
      name,
      email,
      phoneNumber,
      createdAt: getCurrentDate(),
    };
    ownerStorage.insert(owner.id, owner);
    res.status(201).json({ message: "Owner created successfully", owner });
  });

  // Define the endpoint to create a child
  app.post("/children", (req: Request, res: Response) => {
    const { name, birthdate, guardianId } = req.body;

    // Validate the request body
    if (!name || !birthdate || !guardianId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate the GuardianId
    const guardian = guardiansStorage.get(guardianId);
    if (!guardian) {
      return res.status(404).json({ message: "Guardian not found" });
    }

    const child: Child = {
      id: uuidv4(),
      name,
      birthdate: new Date(birthdate),
      guardianId,
      createdAt: getCurrentDate(),
    };
    childrenStorage.insert(child.id, child);
    res.status(201).json({ message: "Child created successfully", child });
  });

  // Define the endpoint to create a guardian
  app.post("/guardians", (req: Request, res: Response) => {
    const { name, email, phoneNumber } = req.body;

    // Validate the request body
    if (!name || !email || !phoneNumber) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate the phone number format
    if (!validatePhoneNumber(phoneNumber)) {
      return res.status(400).json({ message: "Invalid phone number format" });
    }

    // Validate the email format
    if (!validateEmail(email)) {
      return res.status(400).json({ message: "Invalid email format" });
    }

    // Check if a guardian with the same email already exists
    const existingGuardian = guardiansStorage
      .values()
      .find((g) => g.email === email);
    if (existingGuardian) {
      return res.status(409).json({ message: "Guardian with the same email already exists" });
    }

    const guardian: Guardian = {
      id: uuidv4(),
      name,
      email,
      phoneNumber,
      childrenIds: [],
      createdAt: getCurrentDate(),
    };
    guardiansStorage.insert(guardian.id, guardian);
    res.status(201).json({ message: "Guardian created successfully", guardian });
  });

  // Endpoint to set the fee structure (The owner is the only one who can set the fee structure)
  app.post("/fee-structure", (req: Request, res: Response) => {
    const { name, amount, ownerId } = req.body;

    // Validate the request body
    if (!name || !amount || !ownerId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate the OwnerId
    const owner = ownerStorage.get(ownerId);
    if (!owner) {
      return res.status(404).json({ message: "Owner not found" });
    }

    const feeStructure: FeeStructure = {
      id: uuidv4(),
      name,
      amount,
      createdAt: getCurrentDate(),
    };

    feeStructureStorage.insert(feeStructure.id, feeStructure);
    res.status(201).json({ message: "Fee structure created successfully", feeStructure });
  });

  // Define the endpoint to create a payment for multiple children
  app.post("/payments", (req: Request, res: Response) => {
    const { childIds, amount, guardianId } = req.body;

    // Validate the request body
    if (!childIds || !amount || !guardianId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate the GuardianId
    const guardian = guardiansStorage.get(guardianId);
    if (!guardian) {
      return res.status(404).json({ message: "Guardian not found" });
    }

    // Get the fee structure
    const feeStructures = feeStructureStorage.values();
    if (feeStructures.length === 0) {
      return res.status(404).json({ message: "Fee structure not found" });
    }
    const feeStructure = feeStructures[0]; // Assuming there's only one fee structure for now

    // Validate the amount
    let amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    // Validate each childId and ensure they exist
    const invalidChildIds: string[] = [];
    const validChildren = childIds.map((childId: string) => {
      const child = childrenStorage.get(childId);
      if (!child) {
        invalidChildIds.push(childId);
        return null;
      }
      return child;
    }).filter(Boolean) as Child[];

    if (invalidChildIds.length > 0) {
      return res.status(404).json({ message: "Invalid child IDs", invalidChildIds });
    }

    // Calculate the total amount payable
    const totalAmountPayable = feeStructure.amount * validChildren.length;

    // Calculate the amount to be paid for each child
    const amountPerChild = feeStructure.amount;

    // Calculate the balance for each child
    const balancePerChild = validChildren.map((child: Child) => {
      const paymentAmount = Math.min(amountPerChild, amountNum);
      amountNum -= paymentAmount;
      const balance = Math.max(0, amountPerChild - paymentAmount);
      return { childId: child.id, balance };
    });

    // Create a payment object for each child
    const payments: Payment[] = validChildren.map((child: Child) => {
      const paymentAmount = Math.min(amountPerChild, amountNum);
      amountNum -= paymentAmount;
      return {
        id: uuidv4(),
        childId: child.id,
        amount: paymentAmount,
        status: PaymentStatus.PAID,
        date: getCurrentDate(),
      };
    });

    // Store each payment
    payments.forEach((payment: Payment) => {
      paymentsStorage.insert(payment.id, payment);
    });

    res.status(201).json({ message: "Payments created successfully", payments, balancePerChild });
  });

  // Define endpoint to get all children
  app.get("/children", (req: Request, res: Response) => {
    res.json(childrenStorage.values());
  });

  // Define endpoint to get all guardians
  app.get("/guardians", (req: Request, res: Response) => {
    res.json(guardiansStorage.values());
  });

  // Endpoint to get the owner information
  app.get("/owner/:id", (req: Request, res: Response) => {
    const owner = ownerStorage.get(req.params.id);
    if (!owner) {
      return res.status(404).json({ message: "Owner not found" });
    }
    res.json(owner);
  });

  // Define endpoint to get the fee structure
  app.get("/fee-structure/:id", (req: Request, res: Response) => {
    const feeStructure = feeStructureStorage.get(req.params.id);
    if (!feeStructure) {
      return res.status(404).json({ message: "Fee structure not found" });
    }
    res.json(feeStructure);
  });

  // Define endpoint to retrieve a child information by id
  app.get("/children/:id", (req: Request, res: Response) => {
    const child = childrenStorage.get(req.params.id);
    if (!child) {
      return res.status(404).json({ message: "Child not found" });
    }
    res.json(child);
  });

  // Define endpoint to retrieve a guardian information by id
  app.get("/guardians/:id", (req: Request, res: Response) => {
    const guardian = guardiansStorage.get(req.params.id);
    if (!guardian) {
      return res.status(404).json({ message: "Guardian not found" });
    }
    res.json(guardian);
  });

  // Define endpoint to retrieve all payments
  app.get("/payments", (req: Request, res: Response) => {
    res.json(paymentsStorage.values());
  });

  // Define endpoint to update a child information by id
  app.put("/children/:id", (req: Request, res: Response) => {
    const child = childrenStorage.get(req.params.id);
    if (!child) {
      return res.status(404).json({ message: "Child not found" });
    }
    const updatedChild = { ...child, ...req.body };
    childrenStorage.insert(req.params.id, updatedChild);
    res.json(updatedChild);
  });

  // Start the server
  return app.listen();
});