#
# homebox: the LAN speed-test helper that luci-app-netspeedtest drives.
#
# Upstream source: https://github.com/XGHeaven/homebox (MIT upstream is NOT what
# sirpdboy ships here: this release carries a binary built by the iStoreOS
# community and is marked proprietary in the op-packages feed). It is therefore
# a private/self-use package: the registry marks it publicAllowed: false and it
# must never be promoted into a public feed or a public image.
#
# Release: https://github.com/sirpdboy/homebox/releases/tag/v1.0.1
# Asset:   homebox-linux-amd64-musl-v1.0.1.tar.gz (3,094,749 B)
#
include $(TOPDIR)/rules.mk

PKG_NAME:=homebox
PKG_VERSION:=1.0.1
PKG_RELEASE:=6

PKG_SOURCE:=homebox-linux-amd64-musl-v1.0.1.tar.gz
PKG_SOURCE_URL:=https://github.com/sirpdboy/homebox/releases/download/v1.0.1/
PKG_HASH:=5640b5a93846f26a07cfbbb2d6ca9b27efd3ad2d210b327a7c3832beaf8a3e62

PKG_BUILD_DIR:=$(BUILD_DIR)/homebox-linux-amd64-musl-v1.0.1
PKG_LICENSE:=LicenseRef-Proprietary

include $(INCLUDE_DIR)/package.mk

define Package/homebox
  SECTION:=net
  CATEGORY:=Network
  SUBMENU:=Speed Test
  TITLE:=Homebox LAN speed test helper (prebuilt, proprietary)
  URL:=https://github.com/XGHeaven/homebox
  DEPENDS:=@x86_64
endef

define Package/homebox/description
  Proprietary prebuilt helper used by luci-app-netspeedtest. Self-use only:
  the registry marks it publicAllowed: false.
endef

# The archive layout is a bare binary at the root (same as the op-packages
# recipe), so unpack it into the build directory instead of using the default
# "extract into the parent" behaviour.
define Build/Prepare
	mkdir -p $(PKG_BUILD_DIR)
	$(TAR) -xzf $(DL_DIR)/$(PKG_SOURCE) -C $(PKG_BUILD_DIR)
	test -f $(PKG_BUILD_DIR)/homebox || \
		find $(PKG_BUILD_DIR) -type f -name homebox -exec cp {} $(PKG_BUILD_DIR)/homebox \;
endef

define Build/Compile
endef

define Package/homebox/install
	$(INSTALL_DIR) $(1)/usr/bin
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/homebox $(1)/usr/bin/homebox
endef

$(eval $(call BuildPackage,homebox))
