# Feed, comments preview and profile photo

Source baseline: diagnostic build `883a3a423067a8add632117c752cb8ea971ab0c7`.
Isolated implementation branch: `feature/feed-mini-video-avatar`.

## Behavior

- Every setup of the feed comment counts, comment panel, video likes, notifications and incoming call effects owns a fresh database channel. Supabase's reused subscribed topic no longer receives new `postgres_changes` handlers, and an old asynchronous cleanup cannot remove the replacement. Late subscription callbacks are ignored after cleanup.
- Opening feed comments animates the existing single VideoView into a vertical 9:16 preview above the panel. The preview shrinks above the keyboard; its player, current playback position, loop, sound and paused state are retained. Tapping the preview closes comments and restores full size.
- Authenticated viewers see the existing cyan/pink follow + below another creator's avatar when they do not follow that creator. Own and followed creators do not show it; pending requests disable the control.
- Tapping the profile avatar or Editar perfil opens photo selection. The square gallery photo is uploaded as binary ArrayBuffer with its actual image MIME type. A unique owner-scoped path uses the existing Storage INSERT policy and a fresh public URL. Saving requires a matching profile row and avatar URL returned by the server, then refreshes the displayed profile. Upload failures keep the editor and selection available to retry.
- Email registration, eight-digit OTP, approved comment author/moderation rules, floating action popovers and glass bottom navigation retain their behavior.

## Validation

Completed delivery: [Android APK #204](https://github.com/alexandermezad80-dev/TokVid/actions/runs/37696256640), commit `a6e14783bbaede25f5f756f24250b7b62d9a85f0`. All **92 tests**, the complete mobile typecheck, standalone Android build, APK identity/source-map verification and both uploads passed. Gradle reported `BUILD SUCCESSFUL in 26m 55s`. [APK download](https://github.com/alexandermezad80-dev/TokVid/actions/runs/37696256640/artifacts/11516477647). [Verification manifest](continuity/APK_204_VERIFICATION.json). Physical-device confirmation remains pending. Read the [session handoff](continuity/TOKVID_SESSION_HANDOFF.md) before further changes.

Local tests exercise the actual Realtime topic cache and callback guard from the reported APK, delayed cleanup and overlapping setups for the three feed hooks and two global listeners. Additional tests cover keyboard-safe preview geometry, one-player presentation continuity, follow-control states, binary photo formats, upload rejection, profile update confirmation and photo-selection retry.

The local snapshot lacks installed TypeScript/mobile dependencies. Component logic was checked locally with the bundled Playwright Babel TSX transform and mocked native boundaries. The Android workflow repeats the whole suite using installed TypeScript and Supabase dependencies, typechecks the complete mobile project, builds a standalone release APK and checks its diagnostic marker, source map and commit identity.

Physical-device checks after installing the APK:

1. Continue with Google and verify entry into the feed without Try Again.
2. Open comments during video playback, open the keyboard and close the panel by tapping the mini video. Check picture, sound and playback continuity.
3. Follow another unfollowed creator through the gradient +; check that it disappears after the confirmed state change.
4. Perfil → avatar/Editar perfil → choose photo → Guardar. Leave and reopen the profile and restart the app to check persistence.

No physical-device verification is claimed by these automated checks.
