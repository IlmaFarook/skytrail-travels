<?php
// All the rules and limits in one place. PHP uses them, and /api/config
// sends the same values to React.

$rules = [
    'bookingStatuses' => ['Pending', 'Confirmed', 'Cancelled', 'Completed'],
    'minTravellers' => 1,
    'maxTravellers' => 20,
    'specialRequestsMax' => 500,
    'passwordMinLength' => 8,
    'compareMax' => 3,
    'emailPattern' => '^[^\s@]+@[^\s@]+\.[^\s@]+$',
    'phonePattern' => '^[0-9+\-\s()]{7,20}$',
];

function rule($key) {
    global $rules;
    return $rules[$key];
}

// the earliest day a customer can book a trip for (tomorrow, Colombo time)
function min_travel_date() {
    return date('Y-m-d', strtotime('+1 day'));
}

function rules_for_client() {
    global $rules;
    return $rules + ['minTravelDate' => min_travel_date()];
}
