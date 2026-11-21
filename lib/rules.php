<?php
// All the rules and limits in one place. PHP uses them, and /api/config
// sends the same values to React.

// the characters a name may contain; the pattern and the browser's typing filter both use it
$nameChars = '\p{L}\p{M} .\'’-';

$rules = [
    'bookingStatuses' => ['Pending', 'Confirmed', 'Cancelled', 'Completed'],
    'minTravellers' => 1,
    'maxTravellers' => 20,
    'specialRequestsMax' => 500,
    'passwordMinLength' => 8,
    'compareMax' => 3,
    'bookingRefPrefix' => 'ST',
    'suggestMinChars' => 2,
    'suggestMax' => 6,
    'popularMax' => 5,
    'emailMax' => 120,
    'nameMin' => 2,
    'nameMax' => 60,
    'nameChars' => $nameChars,
    'namePattern' => '^[\p{L}\p{M}][' . $nameChars . ']*$',
    'messageMax' => 1000,
    // phone numbers are saved in international form: + country code, 7 to 15 digits in all
    'phonePattern' => '^\+[1-9][0-9]{6,14}$',
    'defaultPhoneCountry' => 'LK',
    'maxTravelDays' => 730,
];

function rule($key) {
    global $rules;
    return $rules[$key];
}

// the earliest day a customer can book a trip for (tomorrow, Colombo time)
function min_travel_date() {
    return date('Y-m-d', strtotime('+1 day'));
}

// the latest day a trip can be booked for
function max_travel_date() {
    return date('Y-m-d', strtotime('+' . rule('maxTravelDays') . ' days'));
}

function rules_for_client() {
    global $rules;
    return $rules + ['minTravelDate' => min_travel_date(), 'maxTravelDate' => max_travel_date()];
}
