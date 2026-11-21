# SPDX-License-Identifier: GPL-3.0-only
#
# Copyright (C) 2021-2026  sirpdboy  <herboy2008@gmail.com>
# https://github.com/sirpdboy/luci-app-netspeedtest
#
# Copied verbatim from kiddin9/op-packages@19a44706dde7554f21c9d0503cdcfc399914067f
# (directory luci-app-netspeedtest) because the upstream repository answers
# "Repository access blocked" on the GitHub API and its tarball cannot be
# fetched. The LuCI code itself is GPL-3.0-only (the file header above); the
# package only *drives* the two proprietary helpers, which are separate
# private/self-use packages here.
#
# Self-use only: the registry marks this package publicAllowed: false because
# its two runtime dependencies are not redistributable.
#

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-netspeedtest

PKG_VERSION:=5.2.1
PKG_RELEASE:=4

LUCI_TITLE:=LuCI Support for netspeedtest
LUCI_DEPENDS:=+ookla-speedtest +homebox +python3-light +python3-pkg-resources +python3-xml +python3-email \
	  +python3-urllib +python3-codecs +python3-openssl +jq $(if $(find_package iperf3-ssl),+iperf3-ssl,+iperf3)
LUCI_PKGARCH:=all
PKG_LICENSE:=GPL-3.0-only
PKG_MAINTAINER:=sirpdboy  <herboy2008@gmail.com>

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
