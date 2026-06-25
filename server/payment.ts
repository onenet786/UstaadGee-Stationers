import { db } from './db.ts';
import { PaymentMethod, PaymentStatus, Order } from '../src/types.ts';

export interface PaymentInitResponse {
  success: boolean;
  message: string;
  transactionId?: string;
  redirectUrl?: string; // For hosted checkout simulation
  formFields?: Record<string, string>; // For POST redirect parameters
}

export class PaymentProcessor {
  /**
   * Initialize a payment gateway session for online payments (Easypaisa/JazzCash/Card)
   */
  static async initiatePayment(order: Order): Promise<PaymentInitResponse> {
    const settings = db.settings.get();
    const transactionId = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Log the initiation
    await db.paymentLogs.create({
      orderId: order.id,
      paymentMethod: order.paymentMethod,
      transactionId,
      amount: order.totalAmount,
      status: 'pending',
      payload: JSON.stringify({
        msg: 'Payment initiation triggered',
        timestamp: new Date().toISOString()
      })
    });

    switch (order.paymentMethod) {
      case 'easypaisa': {
        const config = settings.easypaisa;
        if (!config.active) {
          return { success: false, message: 'Easypaisa payments are currently disabled by the merchant.' };
        }
        
        // Simulating the hosted payment page redirect or API response
        // Easypaisa requires storeId, merchantId, and a secure hash calculated from credentials
        const sandboxHost = config.sandboxMode 
          ? 'https://sandbox.easypay.easypaisa.com.pk/easyPay/Index.jsf'
          : 'https://easypay.easypaisa.com.pk/easyPay/Index.jsf';
        
        // Calculate mock digital signature (MD5/SHA256 simulation)
        const mockHash = `MOCK_SHA256_${config.merchantId}_${order.totalAmount}_${config.hashKey}`;
        
        const redirectUrl = `/api/payments/easypaisa/simulate-gateway?orderId=${order.id}&amount=${order.totalAmount}&txnId=${transactionId}&storeId=${config.storeId}&hash=${mockHash}`;

        return {
          success: true,
          message: 'Easypaisa checkout initialized',
          transactionId,
          redirectUrl
        };
      }

      case 'jazzcash': {
        const config = settings.jazzcash;
        if (!config.active) {
          return { success: false, message: 'JazzCash payments are currently disabled by the merchant.' };
        }

        // JazzCash hosted checkout redirect via POST parameters
        const redirectUrl = `/api/payments/jazzcash/simulate-gateway?orderId=${order.id}&amount=${order.totalAmount}&txnId=${transactionId}&merchantId=${config.merchantId}`;
        
        return {
          success: true,
          message: 'JazzCash checkout initialized',
          transactionId,
          redirectUrl
        };
      }

      case 'bank_transfer': {
        const config = settings.bankTransfer;
        if (!config.active) {
          return { success: false, message: 'Bank Transfer is currently disabled by the merchant.' };
        }

        // Direct instruction for manual bank payment screenshot upload
        return {
          success: true,
          message: 'Please transfer funds to Meezan Bank and upload a screenshot proof in your orders panel.',
          transactionId
        };
      }

      case 'card': {
        // Standard credit/debit card simulated gateway
        const redirectUrl = `/api/payments/card/simulate-gateway?orderId=${order.id}&amount=${order.totalAmount}&txnId=${transactionId}`;
        return {
          success: true,
          message: 'Redirecting to secure Credit/Debit card gateway...',
          transactionId,
          redirectUrl
        };
      }

      case 'cod':
        return {
          success: true,
          message: 'Cash on delivery selected. Payment will be collected upon arrival.',
          transactionId: 'COD-N/A'
        };

      default:
        return { success: false, message: 'Unsupported payment method.' };
    }
  }

  /**
   * Verify an incoming callback or webhook notification from Easypaisa/JazzCash
   */
  static async verifyCallback(
    orderId: string, 
    txnId: string, 
    responseCode: string, 
    recievedHash: string
  ): Promise<{ success: boolean; order?: Order; message: string }> {
    const order = db.orders.findFirst(o => o.id === orderId);
    if (!order) {
      return { success: false, message: 'Order not found.' };
    }

    if (order.paymentStatus === 'paid') {
      return { success: true, order, message: 'Order was already marked as PAID.' };
    }

    // Process transaction update
    if (responseCode === '000' || responseCode === 'SUCCESS') {
      // Create payment log entry
      await db.paymentLogs.create({
        orderId,
        paymentMethod: order.paymentMethod,
        transactionId: txnId,
        amount: order.totalAmount,
        status: 'completed',
        payload: JSON.stringify({ callback_status: 'verified', responseCode, recievedHash })
      });

      // Update Order Status & Payment Status
      // "Automatic stock deduction after confirmed order" -> Let's confirm it as well so stock gets auto-deducted!
      const updatedOrder = await db.orders.updateStatus(
        orderId, 
        'confirmed', // Confirm order on payment success
        'paid', 
        `Payment verified via Gateway Callback. Txn ID: ${txnId}`
      );

      // Log admin audit action
      await db.auditLogs.create({
        userId: 'system-gateway',
        userEmail: 'gateway-callbacks@ustaadgee.com',
        userRole: 'customer',
        action: 'Payment Success Callback',
        details: `Automatic confirmation & payment verification for order ${order.orderNumber} via ${order.paymentMethod.toUpperCase()}. Transaction: ${txnId}`
      });

      return { success: true, order: updatedOrder || order, message: 'Payment successfully processed.' };
    } else {
      // Failed payment callback
      await db.paymentLogs.create({
        orderId,
        paymentMethod: order.paymentMethod,
        transactionId: txnId,
        amount: order.totalAmount,
        status: 'failed',
        payload: JSON.stringify({ callback_status: 'failed_response', responseCode })
      });

      await db.orders.updateStatus(
        orderId, 
        'pending', 
        'failed', 
        `Payment failed. Error Code: ${responseCode}`
      );

      return { success: false, message: 'Payment gateway reported a failed transaction.' };
    }
  }

  /**
   * Handle bank transfer screenshot proof upload and manual approval
   */
  static async processManualBankProof(orderId: string, screenshotUrl: string): Promise<Order | null> {
    const order = db.orders.findFirst(o => o.id === orderId);
    if (!order || order.paymentMethod !== 'bank_transfer') return null;

    // Save proof URL to order
    const updatedOrder = await db.orders.updateStatus(
      orderId, 
      'pending', 
      'unpaid', // Keep unpaid until admin approves
      'Customer uploaded Meezan Bank payment transfer screenshot.'
    );

    if (updatedOrder) {
      // Inject proof url directly
      const idx = db.orders.findMany().findIndex(o => o.id === orderId);
      if (idx !== -1) {
        db.orders.findMany()[idx].paymentProofUrl = screenshotUrl;
      }
    }

    // Log action
    await db.auditLogs.create({
      userId: order.customerId,
      userEmail: order.customerEmail,
      userRole: 'customer',
      action: 'Bank Proof Upload',
      details: `Customer uploaded transfer screenshot for order ${order.orderNumber}.`
    });

    return updatedOrder;
  }

  /**
   * Admin reviews bank proof and approves/rejects payment manually
   */
  static async reviewManualBankProof(
    orderId: string, 
    approve: boolean, 
    adminId: string, 
    adminEmail: string
  ): Promise<Order | null> {
    const order = db.orders.findFirst(o => o.id === orderId);
    if (!order) return null;

    if (approve) {
      // Approve: mark order as Confirmed (stocks will deduct automatically!) and Paid
      const updatedOrder = await db.orders.updateStatus(
        orderId, 
        'confirmed', 
        'paid', 
        `Bank payment receipt approved manually by ${adminEmail}.`
      );

      // Create log
      await db.paymentLogs.create({
        orderId,
        paymentMethod: 'bank_transfer',
        transactionId: order.transactionId || 'MANUAL-BANK-APR',
        amount: order.totalAmount,
        status: 'completed',
        payload: `Approved by admin ${adminEmail}`
      });

      await db.auditLogs.create({
        userId: adminId,
        userEmail: adminEmail,
        userRole: 'admin',
        action: 'Approve Bank Receipt',
        details: `Approved manual bank receipt for order ${order.orderNumber}. Marked as Confirmed/Paid.`
      });

      return updatedOrder;
    } else {
      // Reject: keep pending, mark payment failed, clear proof
      const updatedOrder = await db.orders.updateStatus(
        orderId, 
        'pending', 
        'failed', 
        `Bank payment receipt rejected by ${adminEmail}. Please check account details or upload again.`
      );

      const idx = db.orders.findMany().findIndex(o => o.id === orderId);
      if (idx !== -1) {
        db.orders.findMany()[idx].paymentProofUrl = undefined;
      }

      await db.auditLogs.create({
        userId: adminId,
        userEmail: adminEmail,
        userRole: 'admin',
        action: 'Reject Bank Receipt',
        details: `Rejected bank receipt for order ${order.orderNumber}. Marked payment failed.`
      });

      return updatedOrder;
    }
  }
}
