isomill installer media
=======================

THIS FILE IS A SAMPLE FIXTURE, NOT A LIVE ISO.
It ships with the isomill demo so you can read the contract without building media.

What is this?
  Customized official installer ISO. isomill injected native install configuration into official upstream media. This is not a Fedora or Ubuntu remix authored by isomill.

Which project generated it?
  isomill 0.1.0 (git sample)
  https://github.com/isomill/isomill

Who generated it?
  A self-hosted isomill worker. This file lives on the ISO so the media still
  explains itself if that worker is gone.

Which upstream ISO was used?
  fedora 44
  filename: Fedora-Everything-netinst-x86_64-44-1.5.iso
  url: https://download.fedoraproject.org/pub/fedora/linux/releases/44/Everything/x86_64/iso/Fedora-Everything-netinst-x86_64-44-1.5.iso

What checksum was verified?
  sha256 (not verified in this sample — a live ISO records the checksum this instance actually checked)
  checksum file: https://download.fedoraproject.org/pub/fedora/linux/releases/44/Everything/x86_64/iso/Fedora-Everything-x86_64-44-1.5-CHECKSUM
  signature verified: not yet / sample

Which configuration was embedded?
  adapter: kickstart
  desktop: gnome
  locale: en_GB / gb / Europe/Amsterdam
  See install.cfg and machine-definition.json beside this file.

Which catalogue version was used?
  1.0.0 (see catalogue.lock.json)

Which repositories will the installer contact?
  - [distro] Fedora https://download.fedoraproject.org/
  - [vendor] Microsoft https://packages.microsoft.com/yumrepos/vscode
  - [vendor] Docker https://download.docker.com/linux/fedora
  - [npm] Anthropic https://registry.npmjs.org

NPM
----
npm packages in this configuration are an isomill policy allowlist. They are not signature-verified the way Fedora or Ubuntu packages are. They were configured to install with npm install -g --ignore-scripts.

Packages are resolved at install time by dnf or apt. This file records what
the installer is configured to install, not the exact RPM/DEB versions that
will be chosen on the day you boot it.

Identity, encryption, and storage are not in this configuration. You set
those in the Fedora or Ubuntu install shield.
