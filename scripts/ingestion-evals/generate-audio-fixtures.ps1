$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Speech

$outputDirectory = Join-Path $PSScriptRoot '..\..\supabase\functions\extract-recipe\evals\fixtures\audio'
$outputDirectory = [System.IO.Path]::GetFullPath($outputDirectory)
[System.IO.Directory]::CreateDirectory($outputDirectory) | Out-Null

$fixtures = [ordered]@{
  'clear-chickpea-stew.wav' = 'Chickpea stew, serves four. Use two cans chickpeas, one diced onion, two tablespoons olive oil, one teaspoon cumin, four hundred millilitres chopped tomatoes, and half a teaspoon salt. First soften the onion in the oil for eight minutes. Add cumin and cook for one minute. Add chickpeas and tomatoes, then simmer for twenty minutes. Season with salt.'
  'corrected-pancakes.wav' = 'Quick pancakes. Add three cups of flour. Sorry, make that two cups of flour. Add two teaspoons baking powder, one tablespoon sugar, two eggs, and one and a half cups milk. Whisk the dry ingredients. Add eggs and milk. Then cook ladles of batter on a hot pan for two minutes per side. Makes twelve pancakes.'
  'ingredients-only-soup.wav' = 'For the soup I use two leeks, three potatoes, one litre stock, a tablespoon of butter, salt, and black pepper.'
  'restaurant-conversation.wav' = 'We went to the new restaurant yesterday. I ordered pasta and Sam had tomato soup. The service was slow, but the music was good.'
}

foreach ($fixture in $fixtures.GetEnumerator()) {
  $speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
  try {
    $speaker.SelectVoice('Microsoft Zira Desktop')
    $speaker.Rate = 0
    $speaker.Volume = 100
    $path = Join-Path $outputDirectory $fixture.Key
    $speaker.SetOutputToWaveFile($path)
    $speaker.Speak($fixture.Value)
  }
  finally {
    $speaker.Dispose()
  }
}

function Write-SilentWaveFile {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][int]$DataByteCount
  )

  $writer = [System.IO.BinaryWriter]::new([System.IO.File]::Create($Path))
  try {
    $writer.Write([System.Text.Encoding]::ASCII.GetBytes('RIFF'))
    $writer.Write([int](36 + $DataByteCount))
    $writer.Write([System.Text.Encoding]::ASCII.GetBytes('WAVEfmt '))
    $writer.Write([int]16)
    $writer.Write([int16]1)
    $writer.Write([int16]1)
    $writer.Write([int]16000)
    $writer.Write([int]32000)
    $writer.Write([int16]2)
    $writer.Write([int16]16)
    $writer.Write([System.Text.Encoding]::ASCII.GetBytes('data'))
    $writer.Write([int]$DataByteCount)

    $zeroes = [byte[]]::new(65536)
    $remaining = $DataByteCount
    while ($remaining -gt 0) {
      $chunkSize = [Math]::Min($remaining, $zeroes.Length)
      $writer.Write($zeroes, 0, $chunkSize)
      $remaining -= $chunkSize
    }
  }
  finally {
    $writer.Dispose()
  }
}

Write-SilentWaveFile -Path (Join-Path $outputDirectory 'silent.wav') -DataByteCount 64000
Write-SilentWaveFile -Path (Join-Path $outputDirectory 'oversized.wav') -DataByteCount 6291457

Write-Output "Generated ingestion audio fixtures in $outputDirectory"
