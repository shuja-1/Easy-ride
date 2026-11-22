import { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { dateLabel, inr } from '../utils.js';
import Icon from './Icon.jsx';
import Modal from './Modal.jsx';

const loadRazorpay = () =>
  new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });

export default function PaymentModal({ booking, onClose, onPaid }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stage, setStage] = useState('idle');
  const [payload, setPayload] = useState(null);
  const [utr, setUtr] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const total = payload?.amount || booking.totalPrice;

  const openRazorpay = async (order) => {
    const ready = await loadRazorpay();
    if (!ready || !window.Razorpay) {
      setError('Could not load Razorpay checkout. Please check your connection and retry.');
      return;
    }

    const checkout = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: 'EasyRide',
      description: `${booking.car?.name || 'Car booking'} · ${booking.days} day rental`,
      order_id: order.orderId,
      prefill: { name: user?.name, email: user?.email, contact: user?.phone },
      notes: { bookingId: booking._id },
      theme: { color: '#1d4ed8' },
      config: {
        display: {
          blocks: { upi: { name: 'UPI', instruments: [{ method: 'upi' }] } },
          sequence: ['block.upi'],
          preferences: { show_default_blocks: false },
        },
      },
      handler: async (response) => {
        setBusy(true);
        try {
          await api('/payments/verify', {
            method: 'POST',
            body: { paymentRecordId: order.paymentRecordId, ...response },
          });
          setPayload({ amount: booking.totalPrice, transactionRef: response.razorpay_payment_id });
          setStage('success');
        } catch (verificationError) {
          setError(verificationError.message);
          setStage('idle');
        } finally {
          setBusy(false);
        }
      },
      modal: {
        ondismiss: () => setBusy(false),
      },
    });

    checkout.on('payment.failed', (response) => {
      setError(response?.error?.description || 'The payment failed. Please try again.');
      setStage('idle');
    });
    checkout.open();
  };

  const startPayment = async () => {
    setError('');
    setBusy(true);
    try {
      const order = await api('/payments/create-order', {
        method: 'POST',
        body: { bookingId: booking._id },
      });
      if (order.mode === 'razorpay') {
        await openRazorpay(order);
      } else {
        setPayload(order);
        setStage('demo');
      }
    } catch (startError) {
      setError(startError.message);
      setStage('idle');
    } finally {
      setBusy(false);
    }
  };

  const verifyDemoPayment = async (event) => {
    event.preventDefault();
    const reference = utr.trim();
    if (!/^[A-Za-z0-9-]{6,35}$/.test(reference)) {
      setError('Enter the 6–35 character UPI transaction reference from your payment app.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const result = await api('/payments/verify', {
        method: 'POST',
        body: { paymentRecordId: payload.paymentRecordId, transactionRef: reference },
      });
      setPayload((current) => ({ ...current, ...result.payment }));
      setStage('success');
      toast('Payment verified successfully');
    } catch (verificationError) {
      setError(verificationError.message);
      setStage('demo');
    } finally {
      setBusy(false);
    }
  };

  const finish = () => {
    onPaid();
    onClose();
  };

  const query = payload?.upiUri ? payload.upiUri.split('?')[1] : '';
  const appLinks = payload?.upiUri
    ? [
        { name: 'Google Pay', cls: 'gpay', href: `tez://upi/pay?${query}` },
        { name: 'PhonePe', cls: 'phonepe', href: `phonepe://pay?${query}` },
        { name: 'Paytm', cls: 'paytm', href: `paytmmp://pay?${query}` },
        { name: 'Any UPI app', cls: 'anyupi', href: payload.upiUri },
      ]
    : [];

  const copyUpi = async () => {
    try {
      await navigator.clipboard.writeText(payload.upiId);
      toast('UPI ID copied');
    } catch {
      toast('Could not copy. Please copy the UPI ID manually.', 'error');
    }
  };

  return (
    <Modal
      title={stage === 'success' ? 'Payment successful' : 'Complete your payment'}
      subtitle={`Booking #${booking._id.slice(-6).toUpperCase()} · ${booking.car?.name || 'Car rental'}`}
      onClose={onClose}
    >
      {error && <div className="alert alert-error">{error}</div>}

      {stage === 'success' ? (
        <div className="pay-success">
          <span className="success-mark">
            <Icon name="check" size={30} strokeWidth={2.5} />
          </span>
          <h3>{inr(total)} paid</h3>
          <p>Your UPI payment has been verified and saved against this booking.</p>
          <div className="success-detail">
            <span>Transaction ref</span>
            <strong>{payload?.transactionRef || '—'}</strong>
          </div>
          <button className="btn btn-primary btn-block" onClick={finish}>
            Done
          </button>
        </div>
      ) : stage === 'demo' ? (
        <div className="demo-payment">
          <div className="demo-note">
            <Icon name="shield" size={18} />
            <div>
              <strong>Demo UPI mode</strong>
              <p>
                Razorpay keys are not configured on this server, so no real money is charged.
                Complete the steps below to simulate the verified payment flow.
              </p>
            </div>
          </div>

          <div className="upi-box">
            <div className="upi-amount">
              <span>Amount payable</span>
              <strong>{inr(total)}</strong>
            </div>
            <div className="upi-row">
              <span>
                UPI ID <strong>{payload.upiId}</strong>
              </span>
              <button type="button" className="btn btn-ghost btn-sm" onClick={copyUpi}>
                Copy
              </button>
            </div>
            <div className="upi-row">
              <span>
                Reference <strong>{payload.transactionRef}</strong>
              </span>
            </div>
          </div>

          <div className="pay-apps">
            {appLinks.map((app) => (
              <a key={app.name} href={app.href} className="pay-app">
                <span className={`pay-app-dot ${app.cls}`} />
                {app.name}
              </a>
            ))}
          </div>
          <p className="tiny-note">
            UPI app links work on mobile devices. On desktop, use the UPI ID above with your bank
            app, then enter the transaction reference below.
          </p>

          <form className="verify-form" onSubmit={verifyDemoPayment}>
            <label className="field">
              <span className="field-label">UPI transaction / UTR reference</span>
              <input
                value={utr}
                onChange={(event) => setUtr(event.target.value)}
                placeholder="e.g. 412345678901"
                maxLength={35}
                required
              />
            </label>
            <div className="form-links">
              <button
                type="button"
                className="link-btn"
                onClick={() => setUtr(`DEMO${Date.now().toString().slice(-9)}`)}
              >
                Use a demo reference
              </button>
            </div>
            <button className="btn btn-primary btn-block" disabled={busy}>
              {busy ? (
                <>
                  <span className="spinner spinner-sm" /> Verifying payment…
                </>
              ) : (
                <>
                  <Icon name="shield" size={17} /> I&apos;ve paid — verify payment
                </>
              )}
            </button>
          </form>
        </div>
      ) : (
        <div className="pay-start">
          <div className="pay-summary">
            <div className="pay-summary-top">
              <div>
                <span className="eyebrow">Rental total</span>
                <h3>{inr(total)}</h3>
              </div>
              <span className="pay-mode-pill">
                <Icon name="creditCard" size={14} /> UPI
              </span>
            </div>
            <div className="pay-summary-rows">
              <div>
                <span>Pickup</span>
                <strong>{dateLabel(booking.pickupDate)}</strong>
              </div>
              <div>
                <span>Return</span>
                <strong>{dateLabel(booking.returnDate)}</strong>
              </div>
              <div>
                <span>Duration</span>
                <strong>{booking.days} day{booking.days > 1 ? 's' : ''}</strong>
              </div>
            </div>
          </div>

          <button className="btn btn-primary btn-block btn-lg" onClick={startPayment} disabled={busy}>
            {busy ? (
              <>
                <span className="spinner spinner-sm" /> Preparing payment…
              </>
            ) : (
              <>
                <Icon name="creditCard" size={18} /> Pay {inr(total)} with UPI
              </>
            )}
          </button>

          <p className="secure-note">
            <Icon name="shield" size={15} />
            Payments are verified on the server. With Razorpay keys configured, UPI apps such as
            Google Pay, PhonePe and Paytm are supported.
          </p>
        </div>
      )}
    </Modal>
  );
}
