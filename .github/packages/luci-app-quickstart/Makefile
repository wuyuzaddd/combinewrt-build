#
# luci-app-quickstart: the LuCI menu/controller wrapper for the quickstart
# dashboard. The Vue app is served by the quickstart binary and its static
# assets are installed by the quickstart package from the same release
# archive; this package only adds the admin entry, the views and the i18n
# strings.
#
# Release: v0.17.1-rc20261028 (version kept in sync with the quickstart package)
#
include $(TOPDIR)/rules.mk

LUCI_TITLE:=LuCI support for Quickstart
LUCI_DESCRIPTION:=Menu and translations for the Quickstart first-boot dashboard
LUCI_DEPENDS:=+quickstart +luci-app-ttyd +luci-i18n-ttyd-zh-cn
LUCI_PKGARCH:=all

# Same normalisation as the quickstart package: apk rejects `-rc`, accepts `_rc`.
PKG_VERSION:=0.17.1_rc20261028
PKG_RELEASE:=7
PKG_LICENSE:=GPL-2.0-only

# The static UI is installed by the `quickstart` package from the same release
# archive: keeping one owner avoids two builds downloading the archive and
# guarantees the binary and its front end share one version. Only the LuCI
# controller/view/menu/i18n live here, so this recipe needs no PKG_SOURCE.
LUCI_MINIFY_CSS:=0
LUCI_MINIFY_JS:=0

include $(TOPDIR)/feeds/luci/luci.mk

# The SDK discovers packages by grepping the Makefile for one of the build
# macros (include/scan.mk); luci.mk expands the real call, so keep the marker
# line every LuCI package carries. Without it `make package/<name>/compile`
# fails with "No rule to make target".
# call BuildPackage - OpenWrt buildroot signature
