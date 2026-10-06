<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Printing\QzSigner;
use Illuminate\Http\Request;

/** Certificate + request signing for QZ Tray direct printing — see QzSigner for why. */
class QzController extends Controller
{
    /** The public certificate. `certificate` is null until `php artisan qz:certificate` has been
     *  run on this server, in which case the till falls back to unsigned (prompting) mode. */
    public function certificate(QzSigner $signer)
    {
        return $this->success(['certificate' => $signer->hasCertificate() ? $signer->certificate() : null]);
    }

    public function sign(Request $request, QzSigner $signer)
    {
        $data = $request->validate(['request' => ['required', 'string', 'max:20000']]);

        if (!$signer->hasCertificate()) {
            return $this->success(['signature' => null]);
        }

        return $this->success(['signature' => $signer->sign($data['request'])]);
    }
}
