/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Customer, Invoice, SettingsData } from '../types';
import { formatDate, formatCurrency } from './utils';

export const generateInvoicePDF = (invoice: Invoice, customer: Customer, settings?: SettingsData) => {
  const doc = new jsPDF();
  const businessName = settings?.agencyName || "Nexus Web Agency";
  const businessEmail = settings?.supportEmail || "billing@nexusagency.com";
  const taxRate = settings?.taxRate || 8;

  // Header
  doc.setFontSize(22);
  doc.setTextColor(40, 40, 40);
  doc.text("INVOICE", 140, 20);
  
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(businessName, 20, 20);
  
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(businessEmail, 20, 28);

  // Invoice Info
  doc.setTextColor(0, 0, 0);
  doc.text(`Invoice #: ${invoice.invoiceNumber}`, 140, 35);
  doc.text(`Date: ${formatDate(invoice.date)}`, 140, 42);
  doc.text(`Due Date: ${formatDate(invoice.dueDate)}`, 140, 49);

  // Bill To
  doc.setFontSize(12);
  doc.text("BILL TO:", 20, 60);
  doc.setFontSize(10);
  doc.text(customer.name, 20, 68);
  doc.text(customer.company, 20, 74);
  doc.text(customer.email, 20, 80);
  doc.text(customer.phone, 20, 86);

  // Table
  const tableData = invoice.items.map(item => [
    item.description,
    item.quantity.toString(),
    formatCurrency(item.unitPrice),
    formatCurrency(item.total)
  ]);

  autoTable(doc, {
    startY: 100,
    head: [['Description', 'Qty', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] }, // Indigo-600
  });

  // Summary
  const finalY = (doc as any).lastAutoTable.finalY + 10;
  doc.text(`Subtotal: ${formatCurrency(invoice.subtotal)}`, 140, finalY);
  doc.text(`Tax (${taxRate}%): ${formatCurrency(invoice.tax)}`, 140, finalY + 7);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(`TOTAL: ${formatCurrency(invoice.total)}`, 140, finalY + 16);

  // Footer
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150, 150, 150);
  doc.text("Thank you for your business!", 20, 280);
  doc.text("Payment is expected within 15 days of invoice date.", 20, 285);

  doc.save(`${invoice.invoiceNumber}.pdf`);
};

export const generateReceiptPDF = (invoice: Invoice, customer: Customer, settings?: SettingsData) => {
  const doc = new jsPDF();
  const businessName = settings?.agencyName || "Nexus Web Agency";

  // Header
  doc.setFontSize(22);
  doc.text("RECEIPT", 140, 20);
  
  doc.setFontSize(14);
  doc.text(businessName, 20, 20);
  
  doc.setFontSize(10);
  doc.text(`Receipt #: REC-${invoice.invoiceNumber.split('-').pop()}`, 140, 35);
  doc.text(`Date: ${formatDate(new Date().toISOString())}`, 140, 42);
  doc.text(`Original Invoice: ${invoice.invoiceNumber}`, 140, 49);

  // Customer Info
  doc.setFontSize(12);
  doc.text("RECEIVED FROM:", 20, 60);
  doc.setFontSize(10);
  doc.text(customer.name, 20, 68);
  doc.text(customer.company, 20, 74);

  // Payment Details
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 90, 190, 90);
  
  doc.setFontSize(14);
  doc.text("Payment Amount:", 20, 110);
  doc.text(formatCurrency(invoice.total), 140, 110);
  
  doc.setFontSize(10);
  doc.text("Payment Method: Credit Card (Ending in ****)", 20, 120);
  doc.text("Status: PAID", 20, 127);

  doc.line(20, 140, 190, 140);

  // Footer
  doc.setTextColor(150, 150, 150);
  doc.text("This is an electronically generated receipt.", 20, 280);

  doc.save(`Receipt-${invoice.invoiceNumber}.pdf`);
};
