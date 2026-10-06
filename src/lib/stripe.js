/**
 * Frontend Stripe helpers — all calls go through the stripeClientProxy backend function
 * so the secret key is never exposed in the browser.
 */
import { db } from '@/api/supabaseClient';

const invoke = (action, payload = {}) =>
  db.functions.invoke('stripeClientProxy', { action, payload }).then(r => r.data);

export const testStripeConnection = () => invoke('testConnection');

export const createStripeCustomer = (client) =>
  invoke('createCustomer', { email: client.email, name: client.name, client_id: client.id });

export const sendStripeInvoice = (customerId, amount, description, clientId, clientName) =>
  invoke('sendInvoice', { customer_id: customerId, amount, description, client_id: clientId, client_name: clientName });

export const getClientInvoices = (customerId, clientId) =>
  invoke('getClientInvoices', { customer_id: customerId, client_id: clientId });

export const createPaymentLink = (name, amount, description, clientId) =>
  invoke('createPaymentLink', { name, amount, description, client_id: clientId });

export const listProducts = () => invoke('listProducts');

export const createProduct = (name, amount, description, interval) =>
  invoke('createProduct', { name, amount, description, interval });

export const getCharges = () => invoke('getCharges');