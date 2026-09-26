# Housing Distribution Measures — Provisional Methodology and AHS/ACS Bridge

Status: PROVISIONAL, bridge tested September 2026.

## Definitions
- Near-Median Home-Value Share: housing-unit-weighted share of owner-occupied units with reported property/current market value from 90% to 110% of the weighted median among owner-occupied units.
- Near-Median Gross-Rent Share: housing-unit-weighted share of renter-occupied cash-rent units with monthly gross rent from 90% to 110% of the weighted median among cash-rent units.
- Sensitivity belts: 80%-120% and two-thirds to twice median.
- Always report below / within / above.
- These are price-distribution measures, not affordability measures.

## Source rule
- Use legacy national AHS for pre-ACS historical observations.
- Use annual ACS 1-year PUMS as the canonical modern series.
- The 2009 same-year AHS/ACS overlap is the transition bridge.
- 2017 and 2021 overlaps are sensitivity checks, not calibration points, because AHS underwent a major 2015 redesign and later imputation updates.

## Bridge findings
The 2009 transition is close for the primary and broader belts:
- Home value 90-110: AHS 8.526%, ACS 8.250% (AHS-ACS +0.276 pp).
- Home value 80-120: AHS 21.917%, ACS 21.841% (+0.076 pp).
- Gross rent 90-110: AHS 17.221%, ACS 17.079% (+0.142 pp).
- Gross rent 80-120: AHS 33.690%, ACS 33.374% (+0.316 pp).
- Gross rent 2/3-2x: AHS 72.519%, ACS 71.562% (+0.957 pp).

Later overlaps diverge more, especially the narrow home-value belt and wide gross-rent belt. Treat this as evidence to retain explicit source labels and sensitivity belts rather than mechanically adjusting AHS values to ACS.

## Rent construction
For AHS gross rent, construct an ACS-oriented proxy as cash contract rent plus separately paid electricity, gas, fuel oil, other fuel, and water/sewer; exclude trash/garbage. Contract-rent AHS/ACS comparisons are retained as a diagnostic.

## Interpretation
A shrinking belt indicates greater dispersion around that survey's median, not necessarily worsening affordability. Do not infer individual mobility or housing quality change from the belt shares alone.
