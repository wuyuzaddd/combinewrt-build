#
# luci-app-quickstart: the LuCI menu/controller wrapper for the quickstart
# dashboard. The heavy lifting (the Vue app) is served by the quickstart binary
# itself; this package adds the admin entry, the i18n strings and the static
# assets shipped inside the same official release archive.
#
# Release: v0.17.1-rc20261028 (same archive and PKG_HASH as the quickstart package)
#
include $(TOPDIR)/rules.mk

LUCI_TITLE:=LuCI support for Quickstart
LUCI_DESCRIPTION:=Menu and translations for the Quickstart first-boot dashboard
LUCI_DEPENDS:=+quickstart +luci-app-ttyd +luci-i18n-ttyd-zh-cn
LUCI_PKGARCH:=all

# Same normalisation as the quickstart package: apk rejects `-rc`, accepts `_rc`.
PKG_VERSION:=0.17.1_rc20261028
PKG_RELEASE:=7

PKG_SOURCE:=quickstart-binary-0.17.1-rc20261028.tar.gz
PKG_SOURCE_URL:=https://github.com/istoreos/quickstart/releases/download/v0.17.1-rc20261028/
PKG_HASH:=c2fa6bfe8bc9f7a17f989f43f3103a2cd02314800dcf155989e2ff8f944c8469

PKG_LICENSE:=GPL-2.0-only

# luci.mk pins PKG_BUILD_DIR to $(BUILD_DIR)/$(PKG_NAME) and OpenWrt's default
# unpack keeps the archive's top directory, so strip it explicitly instead of
# renaming the build directory (which luci.mk owns).
PKG_UNPACK=$(TAR) --strip-components=1 -xzf $(DL_DIR)/$(PKG_SOURCE) -C $(PKG_BUILD_DIR)

LUCI_MINIFY_CSS:=0
LUCI_MINIFY_JS:=0

include $(TOPDIR)/feeds/luci/luci.mk

# luci.mk installs ./htdocs of the recipe directory, which is empty here on
# purpose: the assets come from the release archive instead, so the binary and
# its front end can never drift apart.
define Build/Compile
	$(INSTALL_DIR) $(PKG_BUILD_DIR)/htdocs/luci-static/quickstart
	$(CP) $(PKG_BUILD_DIR)/web/luci-static/quickstart/. $(PKG_BUILD_DIR)/htdocs/luci-static/quickstart/
	rm -rf $(PKG_BUILD_DIR)/web
endef
