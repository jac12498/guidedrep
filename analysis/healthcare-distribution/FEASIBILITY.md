# Healthcare Distribution Belt Feasibility Test

Status: FEASIBILITY PASSED / NOT YET FREEZE-READY, September 2026.

## Data source
BLS Consumer Expenditure Survey Interview Public Use Microdata (FMLI), anchor years 1980, 2000, 2008, 2016, 2020, 2024.

## Exposure-distribution method
The CE Interview Survey is quarterly and BLS treats quarterly interviews as statistically independent for annual estimation. To avoid attrition bias from restricting the sample to consumer units observed for a full year, each interview contributes the healthcare spending falling in the target calendar year, annualized by the months of the target year represented by that interview. Population weights use FINLWT21 with the BLS months-in-scope calendar-year adjustment.

This is a distribution of annualized calendar-year healthcare-spending exposure across consumer-unit interviews, not a panel estimate of each household's exact trailing-12-month healthcare expenditure.

## Measures
1. Direct healthcare spending: Interview Survey HEALTH summary, including consumer-paid health insurance, medical services, drugs, and medical supplies.
2. Healthcare burden: annualized direct healthcare spending / annual before-tax CU income.
3. Belts: 90%-110%, 80%-120%, and two-thirds to twice the weighted median.
4. High-burden tails: >10% and >20% of before-tax income.

## Income-universe bridge
Before 2004, CE published income only for complete income reporters. Therefore the 1980 and 2000 burden results use RESPSTAT=1 complete income reporters. From 2004 onward the CE uses multiple imputation and burden results use all CUs with positive imputed before-tax income (FINCBTXM). This 2004 methodology break must be bridge-tested before a full historical burden series is frozen.

## Feasibility findings
Direct-spending median rises from $376 in 1980 to $4,032 in 2024. The narrow 90%-110% belt is small (roughly 5%-7%), while the two-thirds-to-twice-median belt grows from 28.5% to about 36.1%.

Healthcare-burden median is 2.40% in 1980, 2.92% in 2000, 2.88% in 2008, 4.49% in 2016, 5.06% in 2020, and 4.91% in 2024. The share above 10% is 15.6%, 20.8%, 20.9%, 27.9%, 30.3%, and 28.2%, respectively; the share above 20% is 6.8%, 9.9%, 8.8%, 12.5%, 12.8%, and 10.7%.

## Validation / source limitation
The Interview-only calendar-year mean is consistently below the published integrated CE healthcare mean, because published CE tables combine the Interview and Diary surveys and PUMD estimates are not expected to reproduce integrated tables exactly. The gap is fairly stable in modern anchor years:
- 2000 Interview PUMD logic $1,938 vs published integrated $2,066 (-6.2%)
- 2008 $2,816 vs $2,976 (-5.4%)
- 2016 $4,373 vs $4,612 (-5.2%)
- 2020 $4,909 vs $5,177 (-5.2%)
- 2024 $5,910 vs $6,197 (-4.6%)

This stability supports the Interview series as a distributional indicator, but it must be labeled Interview-survey direct healthcare spending rather than the published integrated CE total.

## Recommended status
- Direct Healthcare Spending Distribution: feasible as an Interview-survey distribution indicator.
- Healthcare Burden Distribution: feasible and substantively useful, but not freeze-ready until the 2004 income-imputation bridge is tested.
- 90%-110% belt: retain for consistency, but do not use alone; healthcare spending is too skewed.
- 80%-120% and 2/3-2x belts: retain.
- >10% and >20% of income tails: make core companion indicators because they better identify financial stress.
- Before full historical freeze: test 2003/2004 income bridge, add 2019 pre-pandemic cross-check, and test sensitivity to reported vs imputed income in overlap years.
