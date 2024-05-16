// Import necessary libraries
import { v4 as uuidv4 } from "uuid";
import { Server, Variant, StableBTreeMap, ic } from "azle";
import express from "express";

// Define the Owner class to represent the owner of the day care
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

// Define the FeeStructure class to represent the fee structure or pricing plan for the day care
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

  // Define the endpoint to create an owner, the owner can only be one
  app.post("/owner", (req, res) => {
    // Validate the request body
    if (!req.body.name || !req.body.email || !req.body.phoneNumber) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate the phone number format
    const phonePattern = /^\d{10}$/;
    if (!phonePattern.test(req.body.phoneNumber)) {
      return res.status(400).json([
        {
          status: 400,
          message: "Invalid phone number format",
        },
      ]);
    }

    // Validate the email format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(req.body.email)) {
      return res.status(400).json([
        {
          status: 400,
          message: "Invalid email format",
        },
      ]);
    }

    // Validate the email
    const owner1 = ownerStorage
      .values()
      .find((o) => o.email === req.body.email);
    if (owner1) {
      return res.status(409).json({
        status: 409,
        message: "Owner with the same email already exists",
      });
    }

    const { name, email } = req.body;
    const owner: Owner = {
      id: uuidv4(),
      createdAt: getCurrentDate(),
      ...req.body,
    };
    ownerStorage.insert(owner.id, owner);
    res.json([
      {
        status: 200,
        message: "Owner created successfully",
        owner,
      },
    ]);
  });

  // Define the endpoint to create a child
  app.post("/children", (req, res) => {
    // Validate the request body
    if (!req.body.name || !req.body.birthdate || !req.body.guardianId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate the GuardianId
    const guardian = guardiansStorage.get(req.body.guardianId);
    if (!guardian) {
      return res.status(404).json({ message: "Guardian not found" });
    }

    const { name, birthdate, guardianId } = req.body;
    const child: Child = {
      id: uuidv4(),
      createdAt: getCurrentDate(),
      ...req.body,
    };
    childrenStorage.insert(child.id, child);
    res.json([
      {
        status: 200,
        message: "Child created successfully",
        child,
      },
    ]);
  });

  // Define the endpoint to create a guardian
  app.post("/guardians", (req, res) => {
    // Validate the request body
    if (!req.body.name || !req.body.email || !req.body.phoneNumber) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate the phone number format
    const phonePattern = /^\d{10}$/;
    if (!phonePattern.test(req.body.phoneNumber)) {
      return res.status(400).json([
        {
          status: 400,
          message: "Invalid phone number format",
        },
      ]);
    }

    // Validate the email format
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(req.body.email)) {
      return res.status(400).json([
        {
          status: 400,
          message: "Invalid email format",
        },
      ]);
    }

    // Validate the email
    const guardian1 = guardiansStorage
      .values()
      .find((g) => g.email === req.body.email);
    if (guardian1) {
      return res.status(409).json({
        status: 409,
        message: "Guardian with the same email already exists",
      });
    }

    const { name, email } = req.body;
    const guardian: Guardian = {
      id: uuidv4(),
      createdAt: getCurrentDate(),
      childrenIds: [],
      ...req.body,
    };
    guardiansStorage.insert(guardian.id, guardian);
    res.json([
      {
        status: 200,
        message: "Guardian created successfully",
        guardian,
      },
    ]);
  });

  // Endpoint to set the fee structure(The owner is the only one who can set the fee structure)
  app.post("/fee-structure", (req, res) => {
    // Validate the request body
    if (!req.body.name || !req.body.amount || !req.body.ownerId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate the OwnerId
    const owner = ownerStorage.get(req.body.ownerId);
    if (!owner) {
      return res.status(404).json({ message: "Owner not found" });
    }

    const { name, amount } = req.body;
    const feeStructure: FeeStructure = {
      id: uuidv4(),
      createdAt: getCurrentDate(),
      name,
      amount,
      ...req.body,
    };

    feeStructureStorage.insert(feeStructure.id, feeStructure);
    res.json([
      {
        status: 200,
        message: "Fee structure created successfully",
        feeStructure,
      },
    ]); // Success response
  });

  // Define the endpoint to create a payment for multiple children
  app.post("/payments", (req, res) => {
    // Validate the request body
    if (!req.body.childIds || !req.body.amount || !req.body.guardianId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Validate the GuardianId
    const guardian = guardiansStorage.get(req.body.guardianId);
    if (!guardian) {
      return res.status(404).json({ message: "Guardian not found" });
    }

    // Get the fee structure
    const feeStructure = feeStructureStorage.values()[0]; // Assuming there's only one fee structure for now

    // Validate the amount
    let amount = parseFloat(req.body.amount);
    if (isNaN(amount) || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    // Validate each childId and ensure they exist
    const invalidChildIds: string[] = [];
    const validChildren = req.body.childIds.map((childId: string) => {
      const child = childrenStorage.get(childId);
      if (!child) {
        invalidChildIds.push(childId);
        return null;
      }
      return child;
    });

    if (invalidChildIds.length > 0) {
      return res
        .status(404)
        .json({ message: "Invalid child IDs", invalidChildIds });
    }

    // Calculate the total amount payable
    const totalAmountPayable = feeStructure.amount * validChildren.length;

    // Calculate the amount to be paid for each child
    const amountPerChild = feeStructure.amount;

    // Calculate the balance for each child
    const balancePerChild = validChildren.map((child: Child | null) => {
      if (!child) return { childId: "", balance: 0 }; // Return dummy values for null children
      const paymentAmount = Math.min(amountPerChild, amount);
      amount -= paymentAmount;
      const balance = Math.max(0, amountPerChild - paymentAmount);
      return { childId: child.id, balance };
    });

    // Create a payment object for each child
    const payments: Payment[] = validChildren
      .map((child: Child | null) => {
        if (!child) return null; // Skip null children
        const paymentAmount = Math.min(amountPerChild, amount);
        amount -= paymentAmount;
        return {
          id: uuidv4(),
          childId: child.id,
          amount: paymentAmount,
          status: PaymentStatus.PAID,
          date: getCurrentDate(),
        };
      })
      .filter((payment: Payment | null) => payment !== null) as Payment[]; // Filter out null payments

    // Store each payment
    payments.forEach((payment: Payment) => {
      paymentsStorage.insert(payment.id, payment);
    });

    res.json([
      {
        status: 200,
        message: "Payments created successfully",
        payments,
        balancePerChild,
      },
    ]); // Successful response with array of payments and balance for each child
  });

  // Define endpoint to get all children
  app.get("/children", (req, res) => {
    res.json(childrenStorage.values());
  });

  // Define endpoint to get all guardians
  app.get("/guardians", (req, res) => {
    res.json(guardiansStorage.values());
  });

  // Endpoint to get the owner information
  app.get("/owner/:id", (req, res) => {
    const owner = ownerStorage.get(req.params.id);
    if (!owner) {
      return res.status(404).json({
        status: 404,
        message: "Owner not found",
      });
    }
    res.json(owner);
  });

  // Define endpoint to get the fee structure
  app.get("/fee-structure/:id", (req, res) => {
    const feeStructure = feeStructureStorage.get(req.params.id);
    if (!feeStructure) {
      return res.status(404).json({
        status: 404,
        message: "Fee structure not found",
      });
    }
    res.json(feeStructure);
  });

  // Define endpoint to retrieve a child information by id
  app.get("/children/:id", (req, res) => {
    const child = childrenStorage.get(req.params.id);
    if (!child) {
      return res.status(404).json({
        status: 404,
        message: "Child not found",
      });
    }
    res.json(child);
  });

  // Define endpoint to retrieve a guardian information by id
  app.get("/guardians/:id", (req, res) => {
    const guardian = guardiansStorage.get(req.params.id);
    if (!guardian) {
      return res.status(404).json({
        status: 404,
        message: "Guardian not found",
      });
    }
    res.json(guardian);
  });

  // Define endpoint to retrieve all payments
  app.get("/payments", (req, res) => {
    res.json(paymentsStorage.values());
  });

  // Define endpoint to update a child information by id
  app.put("/children/:id", (req, res) => {
    const child = childrenStorage.get(req.params.id);
    if (!child) {
      return res.status(404).json({
        status: 404,
        message: "Child not found",
      });
    }
    const updatedChild = { ...child, ...req.body };
    childrenStorage.insert(req.params.id, updatedChild);
    res.json(updatedChild);
  });
  

  // Start the server
  return app.listen();
});

// Function to get the current date
function getCurrentDate() {
  const timestamp = new Number(ic.time());
  return new Date(timestamp.valueOf() / 1000_000);
}
