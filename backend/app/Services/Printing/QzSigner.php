<?php

namespace App\Services\Printing;

use RuntimeException;

/**
 * Signs QZ Tray requests with this bakery's own certificate. Without a signature QZ Tray treats
 * the POS as an "anonymous" website and pops up an Allow/Block prompt on every connection — and
 * it refuses to remember "Allow" for anonymous sites. Signed with a fixed certificate, the
 * cashier ticks "Remember this decision" once per till and the prompt never comes back.
 *
 * The private key lives only here on the server (storage/app/private, git-ignored); the browser
 * only ever sees the public certificate and finished signatures.
 */
class QzSigner
{
    public function certificatePath(): string
    {
        return storage_path('app/private/qz/digital-certificate.txt');
    }

    public function privateKeyPath(): string
    {
        return storage_path('app/private/qz/private-key.pem');
    }

    public function hasCertificate(): bool
    {
        return is_file($this->certificatePath()) && is_file($this->privateKeyPath());
    }

    public function certificate(): string
    {
        return (string) file_get_contents($this->certificatePath());
    }

    /** SHA-512 signature (base64) of the exact string QZ Tray asked to be signed. */
    public function sign(string $toSign): string
    {
        $key = openssl_pkey_get_private((string) file_get_contents($this->privateKeyPath()));
        if (!$key || !openssl_sign($toSign, $signature, $key, OPENSSL_ALGO_SHA512)) {
            throw new RuntimeException('Could not sign the QZ Tray request: ' . openssl_error_string());
        }

        return base64_encode($signature);
    }

    /** Creates a new self-signed certificate + private key pair (valid ~30 years). */
    public function generate(string $commonName): void
    {
        $options = [
            'private_key_bits' => 2048,
            'private_key_type' => OPENSSL_KEYTYPE_RSA,
            'digest_alg' => 'sha256',
        ];
        // PHP on Windows/WAMP can't find its OpenSSL config by itself ("No such process"), so
        // point it at the one that ships next to the PHP binary.
        $config = getenv('OPENSSL_CONF') ?: dirname(PHP_BINARY) . DIRECTORY_SEPARATOR . 'extras' . DIRECTORY_SEPARATOR . 'ssl' . DIRECTORY_SEPARATOR . 'openssl.cnf';
        if (is_file($config)) {
            $options['config'] = $config;
        }

        $key = openssl_pkey_new($options);
        $csr = $key ? openssl_csr_new(['commonName' => $commonName, 'organizationName' => $commonName], $key, $options) : false;
        $cert = $csr ? openssl_csr_sign($csr, null, $key, 365 * 30, $options) : false;
        if (!$cert || !openssl_x509_export($cert, $certPem) || !openssl_pkey_export($key, $keyPem, null, $options)) {
            throw new RuntimeException('Could not generate the QZ Tray certificate: ' . openssl_error_string());
        }

        @mkdir(dirname($this->certificatePath()), 0700, true);
        file_put_contents($this->certificatePath(), $certPem);
        file_put_contents($this->privateKeyPath(), $keyPem);
    }
}
