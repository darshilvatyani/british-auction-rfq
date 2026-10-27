import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createRfq } from '../api/rfqApi.js';
import FormField from '../components/FormField.jsx';
import { initialRfqValues, getRfqErrors, buildRfqPayload } from '../utils/rfqForm.js';
import { focusFirstError } from '../utils/focusFirstError.js';

const currencies = [
  { value: 'INR', label: 'INR - Indian rupee' },
  { value: 'USD', label: 'USD - US dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British pound' },
];

const triggers = [
  { value: 'ANY_BID', label: 'Any bid' },
  { value: 'ANY_RANK_CHANGE', label: 'Any supplier rank change' },
  { value: 'L1_CHANGE', label: 'Lowest bidder (L1) change' },
];

const triggerDescriptions = {
  ANY_BID: 'Extend when any supplier submits a bid within the trigger window.',
  ANY_RANK_CHANGE: 'Extend when any supplier changes rank within the trigger window.',
  L1_CHANGE: 'Extend when a different supplier becomes the lowest bidder within the trigger window.',
};

export default function CreateRfq() {
  const [values, setValues] = useState(initialRfqValues);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submitController = useRef(null);
  const navigate = useNavigate();
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    document.title = 'Create RFQ | RFQ Auctions';
    return () => submitController.current?.abort();
  }, []);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;
    setValues((previous) => ({ ...previous, [name]: type === 'checkbox' ? checked : value }));
    setErrors((previous) => ({ ...previous, [name]: undefined }));
    setSubmitError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const validationErrors = getRfqErrors(values);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length) {
      setSubmitError('Please check the highlighted fields.');
      focusFirstError(form, validationErrors);
      return;
    }

    const controller = new AbortController();
    submitController.current = controller;
    setIsSubmitting(true);
    setSubmitError('');

    try {
      const result = await createRfq(buildRfqPayload(values), controller.signal);

      if (!controller.signal.aborted) {
        navigate(`/rfqs/${result.rfq.id}`, { replace: true, state: { created: true } });
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        setSubmitError(err.message);
        setErrors(err.errors || {});
        focusFirstError(form, err.errors || {});
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsSubmitting(false);
      }
    }
  }

  function field(name) {
    return { name, value: values[name], onChange: handleChange, error: errors[name], required: true };
  }

  return (
    <div className="form-page">
      <Link className="back-link" to="/rfqs">Back to auctions</Link>
      <div className="page-heading">
        <h1>Create RFQ</h1>
        <p>Set the RFQ details and bidding schedule. All displayed fields are required.</p>
      </div>
      {submitError && <div className="notice notice--error" role="alert">{submitError}</div>}
      <form className="rfq-form" onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
        <fieldset className="form-section" disabled={isSubmitting}>
          <legend>RFQ details</legend>
          <div className="form-grid">
            <FormField {...field('name')} label="RFQ name" maxLength={150} placeholder="e.g. Mumbai to Pune freight" />
            <FormField {...field('referenceId')} label="Reference ID" maxLength={60} placeholder="e.g. RFQ-2026-001" hint="Use a unique reference. It will be saved in uppercase." />
            <FormField {...field('pickupDate')} label="Pickup / service date" type="date" />
            <FormField {...field('currency')} label="Currency" options={currencies} />
          </div>
        </fieldset>
        <fieldset className="form-section" disabled={isSubmitting}>
          <legend>Bidding schedule</legend>
          <p className="section-note">Enter dates and times in your local time ({timeZone}).</p>
          <div className="form-grid">
            <FormField {...field('bidStartTime')} label="Bid start date and time" type="datetime-local" step={60} />
            <FormField {...field('bidCloseTime')} label="Bid close date and time" type="datetime-local" step={60} />
          </div>
        </fieldset>
        <fieldset className="form-section" disabled={isSubmitting}>
          <legend>Auction settings</legend>
          <div className="checkbox-field">
            <label htmlFor="britishAuctionEnabled">
              <input id="britishAuctionEnabled" name="britishAuctionEnabled" type="checkbox" checked={values.britishAuctionEnabled} onChange={handleChange} aria-describedby="auction-hint" />
              Enable British Auction
            </label>
            <p id="auction-hint" className="field-hint">Qualifying bids near the deadline can extend bidding up to the forced close time.</p>
          </div>
          {values.britishAuctionEnabled ? (
            <div className="form-grid">
              <FormField {...field('forcedCloseTime')} label="Forced close date and time" type="datetime-local" step={60} hint="The final cutoff. It must be later than the bid close time." />
              <FormField {...field('extensionTrigger')} label="Extension trigger" options={triggers} hint={triggerDescriptions[values.extensionTrigger]} />
              <FormField {...field('triggerWindowMinutes')} label="Trigger window (minutes)" type="number" min={1} max={2147483647} step={1} />
              <FormField {...field('extensionMinutes')} label="Extension duration (minutes)" type="number" min={1} max={2147483647} step={1} />
            </div>
          ) : <p className="section-note">This RFQ will use a fixed close time. It will not appear in the British Auction listing.</p>}
        </fieldset>
        <div className="form-actions">
          <button type="button" className="button" onClick={() => navigate('/rfqs')} disabled={isSubmitting}>Cancel</button>
          <button type="submit" className="button button--primary" disabled={isSubmitting}>
            {isSubmitting ? 'Creating RFQ...' : 'Create RFQ'}
          </button>
        </div>
      </form>
    </div>
  );
}
