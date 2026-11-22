import { useEffect, useState } from 'react';
import { api, assetUrl } from '../api.js';
import { useToast } from '../context/ToastContext.jsx';
import { CAR_TYPES, FUEL_TYPES } from '../utils.js';
import Icon from './Icon.jsx';
import Modal from './Modal.jsx';

const CITIES = ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Pune', 'Jaipur', 'Goa', 'Ahmedabad'];

const emptyForm = {
  name: '',
  model: '',
  regNumber: '',
  type: 'Sedan',
  pricePerDay: '',
  fuelType: 'Petrol',
  seats: 5,
  location: '',
  description: '',
};

export default function CarFormModal({ car, onClose, onSaved }) {
  const { toast } = useToast();
  const [form, setForm] = useState(
    car
      ? {
          name: car.name,
          model: car.model,
          regNumber: car.regNumber,
          type: car.type,
          pricePerDay: car.pricePerDay,
          fuelType: car.fuelType,
          seats: car.seats,
          location: car.location,
          description: car.description,
        }
      : emptyForm
  );
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(car ? assetUrl(car.image) : '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(
    () => () => {
      if (preview.startsWith('blob:')) URL.revokeObjectURL(preview);
    },
    [preview]
  );

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const chooseImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Only JPG, PNG or WEBP images are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Image is too large. Maximum size is 5 MB');
      return;
    }
    setError('');
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!car && !image) {
      setError('Please upload a photo of the car');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const data = new FormData();
      Object.entries(form).forEach(([key, value]) => data.append(key, value));
      if (image) data.append('image', image);

      const result = await api(car ? `/cars/${car._id}` : '/cars', {
        method: car ? 'PUT' : 'POST',
        body: data,
      });
      toast(result.message || (car ? 'Car updated' : 'Car submitted for approval'));
      onSaved();
      onClose();
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={car ? 'Edit car listing' : 'Add a new car'}
      subtitle={
        car
          ? 'Changes are visible to customers immediately for approved listings.'
          : 'New listings are reviewed by an admin before they go live.'
      }
      onClose={onClose}
      wide
    >
      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={submit} className="car-form">
        <div className="upload-row">
          <label className="upload-box">
            {preview ? (
              <img src={preview} alt="Car preview" />
            ) : (
              <span className="upload-placeholder">
                <Icon name="image" size={26} />
                <strong>Upload car photo</strong>
                <small>JPG, PNG or WEBP · max 5 MB</small>
              </span>
            )}
            <span className="upload-overlay">
              <Icon name="image" size={16} /> {preview ? 'Change photo' : 'Choose photo'}
            </span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseImage} hidden />
          </label>
          <div className="upload-help">
            <h4>Good photos get booked faster</h4>
            <p>
              Use a clear, well-lit photo showing the full exterior of the car. Landscape images
              work best on the listing cards.
            </p>
            <ul>
              <li>Clean background preferred</li>
              <li>Avoid blurry or night-time shots</li>
              <li>Do not include personal documents</li>
            </ul>
          </div>
        </div>

        <div className="form-grid">
          <label className="field">
            <span className="field-label">Car name</span>
            <input
              value={form.name}
              onChange={update('name')}
              placeholder="e.g. Hyundai Creta"
              required
              maxLength={80}
            />
          </label>
          <label className="field">
            <span className="field-label">Model / variant</span>
            <input
              value={form.model}
              onChange={update('model')}
              placeholder="e.g. 2024 SX (O)"
              required
              maxLength={60}
            />
          </label>
          <label className="field">
            <span className="field-label">Registration number</span>
            <input
              value={form.regNumber}
              onChange={update('regNumber')}
              placeholder="e.g. KA 01 AB 1234"
              required
              maxLength={20}
            />
          </label>
          <label className="field">
            <span className="field-label">Car type</span>
            <select value={form.type} onChange={update('type')}>
              {CAR_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Price per day (₹)</span>
            <input
              type="number"
              min="1"
              value={form.pricePerDay}
              onChange={update('pricePerDay')}
              placeholder="e.g. 3500"
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Fuel type</span>
            <select value={form.fuelType} onChange={update('fuelType')}>
              {FUEL_TYPES.map((fuel) => (
                <option key={fuel} value={fuel}>
                  {fuel}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Seats</span>
            <input
              type="number"
              min="1"
              max="10"
              value={form.seats}
              onChange={update('seats')}
              required
            />
          </label>
          <label className="field">
            <span className="field-label">Pickup city</span>
            <input
              value={form.location}
              onChange={update('location')}
              list="easyride-cities"
              placeholder="e.g. Bengaluru"
              required
              maxLength={60}
            />
            <datalist id="easyride-cities">
              {CITIES.map((city) => (
                <option key={city} value={city} />
              ))}
            </datalist>
          </label>
          <label className="field field-full">
            <span className="field-label">Description</span>
            <textarea
              rows={4}
              value={form.description}
              onChange={update('description')}
              placeholder="Describe the car, its condition, ideal trips and any special features…"
              required
              minLength={20}
              maxLength={700}
            />
            <span className="field-hint">{form.description.length}/700 characters</span>
          </label>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={busy}>
            {busy ? (
              <>
                <span className="spinner spinner-sm" /> Saving…
              </>
            ) : (
              <>
                <Icon name={car ? 'check' : 'plus'} size={16} /> {car ? 'Save changes' : 'Submit for approval'}
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
