# Housing Distribution — Full Historical Calculation

Status: CALCULATED / PROVISIONAL, September 2026.

## Canonical concepts
- Home-value core: housing-unit-weighted share within 90%-110% of the weighted median owner-reported property value.
- Gross-rent core: housing-unit-weighted share within 90%-110% of the weighted median gross rent for cash-rent renter units.
- Sensitivity belts: 80%-120% and two-thirds to twice median.
- Always interpret distribution separately from affordability.

## Chronology
- 1980: AHS. Gross rent is observed. Home value is sensitivity-only because VALUE is interval-coded; Census-style class midpoints are used.
- 1989: AHS near-endpoint for 1988.
- 1993: AHS near-endpoint for 1992.
- 2001: AHS near-endpoint for 2000.
- 2008, 2016, 2024: exact ACS 1-year PUMS endpoints.
- 2020: no standard ACS 1-year PUMS; use 2019 pre-pandemic and 2021 recovery bookends rather than manufacturing a 2020 value.

## Source bridge
AHS is the legacy source and ACS is the modern source. The 2009 same-year bridge passed strongly for the 90%-110% and 80%-120% bands. Do not apply a numerical source correction. Later AHS overlaps remain sensitivity checks only.

## 1980 caution
AHS financial measures in 1983 and earlier were historically reported for specified owners and specified renters. The 1980 VALUE field is categorical. Therefore:
- 1980 home-value distribution is sensitivity-only and must not be plotted as an exact observation.
- 1980 gross-rent distribution is an observed microdata result but should carry an explicit legacy-universe comparability note when compared with post-1983 all-renter results.

## Interpretation
Home value does not show a simple monotonic hollowing. From the same-source ACS 2008→2024 period, the narrow 90%-110% core declines slightly, while the 80%-120% and 2/3-2x belts expand substantially. This reinforces the need to show the broader band beside the narrow band because owner-reported values are heaped at round amounts.

Gross rent shows a clearer long-run thinning around the median. From 1980→2024 the inside shares decline from 18.458%→15.237% for 90%-110%, 36.327%→29.678% for 80%-120%, and 74.975%→68.086% for 2/3-2x. This is a distributional observation, not a statement about affordability or individual mobility.
