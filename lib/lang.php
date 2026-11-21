<?php

$lang_strings = require __DIR__ . '/../lang/en.php';

// Looks up a text by key and fills in {name} placeholders.
// If $vars has a 'count', key_one or key_other is used when it exists.
function t($key, $vars = []) {
    global $lang_strings;

    if (isset($vars['count'])) {
        $plural = $key . ($vars['count'] == 1 ? '_one' : '_other');
        if (isset($lang_strings[$plural])) {
            $key = $plural;
        }
    }
    $text = isset($lang_strings[$key]) ? $lang_strings[$key] : $key;
    foreach ($vars as $name => $value) {
        $text = str_replace('{' . $name . '}', $value, $text);
    }
    return $text;
}
