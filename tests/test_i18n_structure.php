<?php

/**
 * Тест соответствия структуры файлов локализации.
 * Эталон — ru.json. Проверяется:
 *   1. Все ключи (с любой вложенностью) присутствуют в каждой локали.
 *   2. Нет лишних ключей, которых нет в эталоне.
 *   3. Неассоциативные массивы (lists) идентичны по длине.
 */

$langDir = __DIR__ . '/../lang';
$reference = 'ru';

// ---- helpers ----------------------------------------------------------------

function is_list(array $arr): bool
{
    return array_is_list($arr);
}

/**
 * Рекурсивно собирает все пути ключей вида "a.b.c" и тип листа.
 * Для list-узлов добавляет сам путь с пометкой длины; вглубь не идёт.
 */
function collect_paths(mixed $node, string $prefix = ''): array
{
    if (!is_array($node)) {
        return [$prefix => 'scalar'];
    }

    if (is_list($node)) {
        return [$prefix => ['list', count($node)]];
    }

    $paths = [];
    foreach ($node as $key => $value) {
        $path = $prefix === '' ? (string)$key : "$prefix.$key";
        $sub  = collect_paths($value, $path);
        $paths = array_merge($paths, $sub);
    }
    return $paths;
}

function load_json(string $file): array
{
    $raw = file_get_contents($file);
    if ($raw === false) {
        throw new RuntimeException("Не удалось прочитать файл: $file");
    }
    $data = json_decode($raw, true);
    if ($data === null) {
        throw new RuntimeException("Невалидный JSON: $file — " . json_last_error_msg());
    }
    return $data;
}

// ---- load reference ---------------------------------------------------------

$refFile = "$langDir/$reference.json";
if (!file_exists($refFile)) {
    echo "FAIL: эталонный файл не найден: $refFile\n";
    exit(1);
}

$refData  = load_json($refFile);
$refPaths = collect_paths($refData);

// ---- collect locale files ---------------------------------------------------

$localeFiles = glob("$langDir/*.json");
if ($localeFiles === false || count($localeFiles) === 0) {
    echo "FAIL: не найдено ни одного JSON-файла в $langDir\n";
    exit(1);
}

// ---- run checks -------------------------------------------------------------

$totalErrors = 0;
$passCount   = 0;

foreach ($localeFiles as $file) {
    $locale = basename($file, '.json');
    if ($locale === $reference) {
        continue; // эталон не проверяем сам по себе
    }

    $errors = [];

    try {
        $data  = load_json($file);
        $paths = collect_paths($data);
    } catch (RuntimeException $e) {
        echo "FAIL [$locale]: " . $e->getMessage() . "\n";
        $totalErrors++;
        continue;
    }

    // 1. Ключи из эталона, отсутствующие в локали
    foreach ($refPaths as $path => $refMeta) {
        if (!array_key_exists($path, $paths)) {
            $errors[] = "отсутствует ключ: $path";
            continue;
        }

        $localeMeta = $paths[$path];

        // 2. List: проверяем длину
        if (is_array($refMeta) && $refMeta[0] === 'list') {
            if (!is_array($localeMeta) || $localeMeta[0] !== 'list') {
                $errors[] = "ключ '$path' должен быть массивом (list)";
            } elseif ($localeMeta[1] !== $refMeta[1]) {
                $errors[] = sprintf(
                    "ключ '%s': длина списка %d, ожидается %d",
                    $path,
                    $localeMeta[1],
                    $refMeta[1]
                );
            }
        }
    }

    // 3. Лишние ключи в локали
    foreach ($paths as $path => $meta) {
        if (!array_key_exists($path, $refPaths)) {
            $errors[] = "лишний ключ (нет в эталоне): $path";
        }
    }

    if ($errors) {
        $totalErrors += count($errors);
        echo "FAIL [$locale]:\n";
        foreach ($errors as $err) {
            echo "  - $err\n";
        }
    } else {
        echo "OK   [$locale]\n";
        $passCount++;
    }
}

// ---- summary ----------------------------------------------------------------

$checkedCount = count($localeFiles) - 1; // минус эталон
echo "\n";
echo "Проверено локалей: $checkedCount  |  OK: $passCount  |  Ошибок: $totalErrors\n";

exit($totalErrors > 0 ? 1 : 0);
