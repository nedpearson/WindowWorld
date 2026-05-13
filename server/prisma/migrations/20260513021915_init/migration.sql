-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'sales_rep',
    "password" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT DEFAULT 'LA',
    "zip" TEXT,
    "notes" TEXT,
    "leadSource" TEXT,
    "preLead1978" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "customerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "appointmentDate" DATETIME,
    "jobAddress" TEXT,
    "jobCity" TEXT,
    "jobState" TEXT DEFAULT 'LA',
    "jobZip" TEXT,
    "projectType" TEXT,
    "notes" TEXT,
    "estimatorNotes" TEXT,
    "installerNotes" TEXT,
    "officeNotes" TEXT,
    "subtotal" REAL NOT NULL DEFAULT 0,
    "taxRate" REAL NOT NULL DEFAULT 0.0945,
    "taxAmount" REAL NOT NULL DEFAULT 0,
    "adminFee" REAL NOT NULL DEFAULT 0,
    "discount" REAL NOT NULL DEFAULT 0,
    "totalAmount" REAL NOT NULL DEFAULT 0,
    "depositAmount" REAL NOT NULL DEFAULT 0,
    "balanceDue" REAL NOT NULL DEFAULT 0,
    "financingAmount" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Appointment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Opening" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointmentId" TEXT NOT NULL,
    "openingNumber" INTEGER NOT NULL,
    "roomLocation" TEXT,
    "elevation" TEXT,
    "width" REAL,
    "height" REAL,
    "unitedInches" REAL,
    "productCategory" TEXT,
    "seriesModel" TEXT,
    "interiorColor" TEXT,
    "exteriorColor" TEXT,
    "gridStyle" TEXT,
    "gridPattern" TEXT,
    "glassPackage" TEXT,
    "temperedGlass" BOOLEAN NOT NULL DEFAULT false,
    "obscureGlass" BOOLEAN NOT NULL DEFAULT false,
    "argon" BOOLEAN NOT NULL DEFAULT false,
    "foamEnhanced" BOOLEAN NOT NULL DEFAULT false,
    "lowEPackage" TEXT,
    "screenOption" TEXT,
    "trimNotes" TEXT,
    "removalType" TEXT,
    "installNotes" TEXT,
    "customerNotes" TEXT,
    "installerNotes" TEXT,
    "basePrice" REAL NOT NULL DEFAULT 0,
    "optionsPrice" REAL NOT NULL DEFAULT 0,
    "laborPrice" REAL NOT NULL DEFAULT 0,
    "totalPrice" REAL NOT NULL DEFAULT 0,
    "radius" REAL,
    "customRadius" REAL,
    "legHeight" REAL,
    "specialtyNotes" TEXT,
    "needsVerification" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Opening_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "OpeningPhoto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "openingId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OpeningPhoto_openingId_fkey" FOREIGN KEY ("openingId") REFERENCES "Opening" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PricingTable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PricingItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pricingTableId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sku" TEXT,
    "unitedInchesMin" REAL,
    "unitedInchesMax" REAL,
    "seriesModel" TEXT,
    "productCategory" TEXT,
    "price" REAL NOT NULL DEFAULT 0,
    "priceType" TEXT NOT NULL DEFAULT 'flat',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "needsVerification" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PricingItem_pricingTableId_fkey" FOREIGN KEY ("pricingTableId") REFERENCES "PricingTable" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "QuoteLineItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointmentId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" REAL NOT NULL DEFAULT 0,
    "totalPrice" REAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "needsVerification" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "QuoteLineItem_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointmentId" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "generatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Contract_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Signature" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointmentId" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerRole" TEXT NOT NULL,
    "signatureData" TEXT NOT NULL,
    "signedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Signature_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointmentId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "paidAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HouseMap" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointmentId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HouseMap_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "HouseMapMarker" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "houseMapId" TEXT NOT NULL,
    "elevation" TEXT NOT NULL,
    "x" REAL NOT NULL,
    "y" REAL NOT NULL,
    "openingNumber" INTEGER NOT NULL,
    "label" TEXT,
    CONSTRAINT "HouseMapMarker_houseMapId_fkey" FOREIGN KEY ("houseMapId") REFERENCES "HouseMap" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "HouseMap_appointmentId_key" ON "HouseMap"("appointmentId");
