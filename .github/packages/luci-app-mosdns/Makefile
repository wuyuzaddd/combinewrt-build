# Repackage the sbwml LuCI panel from its pinned 25.12 release bundle.
#
# The panel ships the init script and the UCI config that the sbwml core expects;
# the official ImmortalWrt mosdns core owns /etc/init.d/mosdns with a different
# script, so the panel and that core must never be mixed. Building this package
# from the same pinned release keeps the pair consistent.
include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-mosdns
PKG_VERSION:=1.7.15
PKG_RELEASE:=1

PKG_SOURCE:=x86_64-openwrt-25.12.tar.gz
PKG_SOURCE_URL:=https://github.com/sbwml/luci-app-mosdns/releases/download/v5.3.4-r15
PKG_HASH:=d7147e3e7af7e2c7e849f3f501d06ec5bfbc8630c26267ee609c4b8601626e2c
PKG_LICENSE:=GPL-3.0-only
PKG_LICENSE_FILES:=LICENSE
PKG_BUILD_PARALLEL:=1
PKG_BUILD_DIR:=$(BUILD_DIR)/luci-app-mosdns-$(PKG_VERSION)

include $(INCLUDE_DIR)/package.mk

define Package/luci-app-mosdns
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=LuCI Support for mosdns (prebuilt)
  DEPENDS:=+mosdns-sbwml +uclient-fetch +v2ray-geoip +v2ray-geosite +geo2txt +ucode
  PKGARCH:=all
endef

# The release tarball unpacks with or without its top-level packages_ci/
# directory depending on the unpack helper, so resolve the apk with make-time
# wildcards instead of a shell glob.
PKG_APK=$(firstword $(wildcard $(PKG_BUILD_DIR)/packages_ci/*.apk) $(wildcard $(PKG_BUILD_DIR)/*.apk))
define Build/Compile
	mkdir -p $(PKG_BUILD_DIR)/payload
	cd $(PKG_BUILD_DIR)/payload && \
		$(STAGING_DIR_HOST)/bin/apk extract --allow-untrusted $$(test -n "$(PKG_APK)" && echo "$(PKG_APK)" || echo "$(PKG_BUILD_DIR)/missing.apk")
	rm -rf $(PKG_BUILD_DIR)/payload/lib/apk
endef

define Package/luci-app-mosdns/install
	$(CP) $(PKG_BUILD_DIR)/payload/. $(1)/
endef

$(eval $(call BuildPackage,luci-app-mosdns))
