<?php

declare(strict_types=1);

namespace Mafia\Tests;

final class I18nStructureTester implements Testable
{
    private string $langDir;
    private string $reference;

    public function __construct(string $langDir, string $reference = 'ru')
    {
        $this->langDir = $langDir;
        $this->reference = $reference;
    }

    public function run(): int
    {
        $refPaths = $this->loadReferencePaths();
        $localeFiles = $this->resolveLocaleFiles();
        [$passCount, $totalErrors] = $this->checkLocales($localeFiles, $refPaths);

        $checkedCount = count($localeFiles) - 1;
        echo "\nLocales checked: {$checkedCount}  |  OK: {$passCount}  |  Errors: {$totalErrors}\n";

        return $totalErrors > 0 ? 1 : 0;
    }

    /** @return array<string, mixed> */
    private function loadReferencePaths(): array
    {
        $refFile = "{$this->langDir}/{$this->reference}.json";

        if (!file_exists($refFile)) {
            echo "FAIL: reference file not found: $refFile\n";
            exit(1);
        }

        return $this->collectPaths($this->loadJson($refFile));
    }

    /** @return list<string> */
    private function resolveLocaleFiles(): array
    {
        $files = glob("{$this->langDir}/*.json");

        if ($files === false || count($files) === 0) {
            echo "FAIL: no JSON files found in {$this->langDir}\n";
            exit(1);
        }

        return $files;
    }

    /**
     * @param list<string> $localeFiles
     * @param array<string, mixed> $refPaths
     * @return array{int, int}
     */
    private function checkLocales(array $localeFiles, array $refPaths): array
    {
        $totalErrors = 0;
        $passCount = 0;

        foreach ($localeFiles as $file) {
            $locale = basename($file, '.json');

            if ($locale === $this->reference) {
                continue;
            }

            try {
                $localePaths = $this->collectPaths($this->loadJson($file));
            } catch (\RuntimeException $e) {
                echo "FAIL [{$locale}]: " . $e->getMessage() . "\n";
                $totalErrors++;
                continue;
            }

            $errors = $this->validateLocale($refPaths, $localePaths);

            if (count($errors) > 0) {
                $totalErrors += count($errors);
                echo "FAIL [{$locale}]:\n";
                foreach ($errors as $err) {
                    echo "  - {$err}\n";
                }
            } else {
                echo "OK   [{$locale}]\n";
                $passCount++;
            }
        }

        return [$passCount, $totalErrors];
    }

    /** @return array<string, mixed> */
    private function collectPaths(mixed $node, string $prefix = ''): array
    {
        if (!is_array($node)) {
            return [$prefix => 'scalar'];
        }

        if (array_is_list($node)) {
            return [$prefix => ['list', count($node)]];
        }

        $paths = [];

        foreach ($node as $key => $value) {
            $path = $prefix === '' ? (string) $key : "$prefix.$key";
            $paths = array_merge($paths, $this->collectPaths($value, $path));
        }

        return $paths;
    }

    /** @return array<string, mixed> */
    private function loadJson(string $file): array
    {
        $raw = file_get_contents($file);

        if ($raw === false) {
            throw new \RuntimeException("Failed to read file: $file");
        }

        /** @var array<string, mixed>|null $data */
        $data = json_decode($raw, true);

        if (!is_array($data)) {
            throw new \RuntimeException("Invalid JSON: $file — " . json_last_error_msg());
        }

        return $data;
    }

    /**
     * @param array<string, mixed> $refPaths
     * @param array<string, mixed> $localePaths
     * @return list<string>
     */
    private function validateLocale(array $refPaths, array $localePaths): array
    {
        $errors = [];

        foreach ($refPaths as $path => $refMeta) {
            if (!array_key_exists($path, $localePaths)) {
                $errors[] = "missing key: $path";
                continue;
            }

            $localeMeta = $localePaths[$path];

            if (is_array($refMeta) && isset($refMeta[0]) && $refMeta[0] === 'list') {
                if (!is_array($localeMeta) || !isset($localeMeta[0]) || $localeMeta[0] !== 'list') {
                    $errors[] = "key '$path' must be a list";
                } elseif (
                    isset($localeMeta[1], $refMeta[1])
                    && is_int($localeMeta[1])
                    && is_int($refMeta[1])
                    && $localeMeta[1] !== $refMeta[1]
                ) {
                    $errors[] = sprintf(
                        "key '%s': list length %d, expected %d",
                        $path,
                        $localeMeta[1],
                        $refMeta[1]
                    );
                }
            }
        }

        foreach ($localePaths as $path => $meta) {
            if (!array_key_exists($path, $refPaths)) {
                $errors[] = "extra key (not in reference): $path";
            }
        }

        return $errors;
    }
}
