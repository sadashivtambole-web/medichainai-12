// ============================================================================
// MediChainAI Demonstration Reference Codes
// NOTE: Actual live medicine verification in MediChainAI queries the live Express
// backend and MongoDB blockchain ledger. The records below serve solely as
// fallback reference codes for offline demonstration testing.
// ============================================================================
export const mockRegistry = {
  'MEDG-AMOX-500-A1B2': {
    name: 'Amoxicillin 500mg',
    manufacturer: 'Sun Pharma',
    batch: 'AMX24-0912',
    mfgDate: '2024-09-01',
    expiry: '2026-09-01',
    serial: 'A1B2',
  },
  'MEDG-PARA-650-C3D4': {
    name: 'Paracetamol 650mg',
    manufacturer: 'Cipla',
    batch: 'PARA23-0455',
    mfgDate: '2023-04-01',
    expiry: '2025-04-01', // already expired -> flagged
    serial: 'C3D4',
  },
  'MEDG-METF-850-E5F6': {
    name: 'Metformin 850mg',
    manufacturer: 'Dr. Reddy’s',
    batch: 'MET25-1187',
    mfgDate: '2025-01-15',
    expiry: '2027-01-15',
    serial: 'E5F6',
  },
}

// A couple of ready-made demo codes you can type on the Verify page:
//   MEDG-AMOX-500-A1B2  -> genuine
//   MEDG-PARA-650-C3D4  -> expired
//   ANYTHING-ELSE       -> counterfeit / not found
export const demoCodes = Object.keys(mockRegistry)
