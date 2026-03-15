<?php

declare(strict_types=1);

require_once __DIR__ . '/../vendor/autoload.php';

use Mafia\Tests\I18nStructureTester;

$res = 0;

$res |= (new I18nStructureTester(__DIR__ . '/../lang'))->run();

exit($res);
