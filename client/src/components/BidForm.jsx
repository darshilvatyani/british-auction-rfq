import { useEffect, useRef, useState } from 'react';
import { getSuppliers, submitBid } from '../api/rfqApi.js';
import FormField from './FormField.jsx';
import { initialBidValues, getBidErrors, getQuoteTotal, buildBidPayload } from '../utils/bidForm.js';
import { currencyDigits, formatMoney, formatMoneyInput } from '../utils/formatMoney.js';
import { toLocalDateTimeInput } from '../utils/formatDate.js';
import { focusFirstError } from '../utils/focusFirstError.js';
import { getAuctionStatus } from '../utils/auctionTime.js';

export default function BidForm({ rfq, rankings, now, onSubmitted }) {
  const [values, setValues] = useState(initialBidValues);
  const [suppliers, setSuppliers] = useState([]);
  const [supplierError, setSupplierError] = useState('');
  const [supplierRefresh, setSupplierRefresh] = useState(0);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [retryPending, setRetryPending] = useState(false);
  const pendingRequest = useRef(null);
  const submitController = useRef(null);
  const previousQuote = rankings.find((bid) => bid.supplierId === Number(values.supplierId));
  const isOpen = getAuctionStatus(rfq, now) === 'Active';
  const total = getQuoteTotal(values, rfq.currency);
  const step = currencyDigits(rfq.currency) === 0 ? '1' : `0.${'0'.repeat(currencyDigits(rfq.currency) - 1)}1`;

  useEffect(() => {
    const controller = new AbortController();
    getSuppliers(controller.signal).then((data) => {
      if (!controller.signal.aborted) {
        setSuppliers(data.suppliers);
        setSupplierError('');
      }
    }).catch((err) => { if (!controller.signal.aborted) setSupplierError(err.message); });
    return () => controller.abort();
  }, [supplierRefresh]);

  useEffect(() => () => submitController.current?.abort(), []);

  function handleChange(event) {
    const { name, value } = event.target;
    pendingRequest.current = null;
    setRetryPending(false);
    setError('');
    setSuccess('');
    setErrors((previous) => ({ ...previous, [name]: undefined, totalAmount: undefined }));

    if (name === 'supplierId') {
      const quote = rankings.find((bid) => bid.supplierId === Number(value));
      setValues(quote ? {
        supplierId: value, carrierName: quote.carrierName,
        freightCharges: formatMoneyInput(quote.freightCharges, rfq.currency),
        originCharges: formatMoneyInput(quote.originCharges, rfq.currency),
        destinationCharges: formatMoneyInput(quote.destinationCharges, rfq.currency),
        transitDays: String(quote.transitDays),
        quoteValidUntil: Date.parse(quote.quoteValidUntil) > now ? toLocalDateTimeInput(quote.quoteValidUntil) : '',
      } : { ...initialBidValues, supplierId: value });
      setErrors({});
      return;
    }

    setValues((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!isOpen || isSubmitting) return;
    const form = event.currentTarget;
    const validationErrors = getBidErrors(values, rfq.currency, now, previousQuote, Boolean(pendingRequest.current));
    setErrors(validationErrors);
    setSuccess('');

    if (Object.keys(validationErrors).length) {
      setError('Please check the highlighted fields.');
      focusFirstError(form, validationErrors);
      return;
    }

    if (!pendingRequest.current) {
      pendingRequest.current = { ...buildBidPayload(values, rfq.currency), requestId: crypto.randomUUID() };
    }

    const controller = new AbortController();
    submitController.current = controller;
    setIsSubmitting(true);
    setError('');

    try {
      const result = await submitBid(rfq.id, pendingRequest.current, controller.signal);
      if (!controller.signal.aborted) {
        pendingRequest.current = null;
        setRetryPending(false);
        setSuccess(result.replayed ? 'This quote was already accepted.' : 'Quote submitted.');
        setErrors({});
        onSubmitted();
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        if (err.status >= 400 && err.status < 500) {
          pendingRequest.current = null;
          setRetryPending(false);
          setError(err.message);
        } else {
          setRetryPending(true);
          setError('The submission could not be confirmed. Retry without changing the fields, or refresh to check the bid history.');
        }
        setErrors(err.errors || {});
        focusFirstError(form, err.errors || {});
        onSubmitted();
      }
    } finally {
      if (!controller.signal.aborted) setIsSubmitting(false);
    }
  }

  function field(name) {
    return { name, value: values[name], error: errors[name], required: true };
  }

  return (
    <section className="details-section" aria-labelledby="quote-heading">
      <h2 id="quote-heading">Submit a quote</h2>
      {!isOpen && <p className="section-note">{getAuctionStatus(rfq, now) === 'Upcoming' ? 'Bidding has not started yet. You can prepare a quote below.' : 'Bidding is closed.'}</p>}
      {supplierError && <div className="notice notice--error" role="alert">{supplierError} <button type="button" className="text-button" onClick={() => setSupplierRefresh((value) => value + 1)}>Reload suppliers</button></div>}
      {error && <div className="notice notice--error" role="alert">{error}</div>}
      {success && <div className="notice notice--success" role="status">{success}</div>}
      <form onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
        <fieldset className="quote-fields" disabled={isSubmitting}>
          <FormField onChange={handleChange} {...field('supplierId')} label="Supplier (demo)" options={[
            { value: '', label: suppliers.length ? 'Choose a supplier' : 'Loading suppliers...' },
            ...suppliers.map((supplier) => ({ value: String(supplier.id), label: supplier.name })),
          ]} hint="Select a demo supplier to submit or revise its quote." />
          {previousQuote && <p className="current-quote">Your current quote: <strong>{formatMoney(previousQuote.totalAmount, rfq.currency)}</strong> ({previousQuote.rank}). Submit a lower total to revise it.</p>}
          <FormField onChange={handleChange} {...field('carrierName')} label="Carrier name" maxLength={150} />
          <div className="form-grid quote-grid">
            <FormField onChange={handleChange} {...field('freightCharges')} label={`Freight charges (${rfq.currency})`} type="number" min={0} step={step} />
            <FormField onChange={handleChange} {...field('originCharges')} label={`Origin charges (${rfq.currency})`} type="number" min={0} step={step} />
            <FormField onChange={handleChange} {...field('destinationCharges')} label={`Destination charges (${rfq.currency})`} type="number" min={0} step={step} />
            <FormField onChange={handleChange} {...field('transitDays')} label="Transit time (days)" type="number" min={1} step={1} />
          </div>
          <FormField onChange={handleChange} {...field('quoteValidUntil')} label="Quote valid until" type="datetime-local" step={60} hint="Use your local date and time." />
          <div className="quote-total"><span>Total quote</span><output name="totalAmount" tabIndex={-1} aria-describedby={errors.totalAmount ? 'totalAmount-error' : undefined}>{total === null ? '—' : formatMoney(total, rfq.currency)}</output></div>
          {errors.totalAmount && <p id="totalAmount-error" className="field-error">{errors.totalAmount}</p>}
        </fieldset>
        <button className="button button--primary quote-submit" type="submit" disabled={!isOpen || isSubmitting || suppliers.length === 0}>
          {isSubmitting ? 'Submitting...' : retryPending ? 'Retry quote' : previousQuote ? 'Update quote' : 'Submit quote'}
        </button>
      </form>
    </section>
  );
}
