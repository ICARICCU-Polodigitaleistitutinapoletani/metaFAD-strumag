<?php
$serverInfo = [
    'env' => [
        'instance' => 'develop',
        'server' => getenv('METAFAD_URL').'/',
        'serverTecaStrumag' => getenv('METAFAD_TECA_STRUMAG_URL'),
        'serverDam' => getenv('DAM_FE_URL'),
        'serverRoot' => getenv('METAFAD_URL').'/rest/strumag/',
        'serverRest' => getenv('METAFAD_URL').'/rest/',
        'status' => 'prod'

    ]
];

$info = isset($serverInfo[$_SERVER['SERVER_NAME']]) ? $serverInfo[$_SERVER['SERVER_NAME']] : $serverInfo['env'];

$json = file_get_contents('config.js');

if($info){
    $json = str_replace(['##INSTANCE##', '##SERVER##', '##SERVER_TS##', '##SERVER_DAM##', '##SERVER_ROOT##', '##SERVER_REST##', '##STATUS##'],
        [$info['instance'], $info['server'], $info['serverTecaStrumag'], $info['serverDam'], $info['serverRoot'], $info['serverRest'], $info['status']],
        $json);
}
echo $json;

?>