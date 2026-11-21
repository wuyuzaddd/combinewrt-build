#
# quickstart: the iStoreOS/EasePi quick-start dashboard.
#
# Upstream: https://github.com/istoreos/quickstart (MIT). The repository is a Go
# web app with no OpenWrt package definition, so this recipe consumes the
# official prebuilt release archive. Binary and web assets of one image come
# from the same archive, which is why luci-app-quickstart downloads it too.
#
# Release: v0.17.1-rc20261028
# Archive: quickstart-binary-0.17.1-rc20261028.tar.gz (16 229 016 bytes)
#
include $(TOPDIR)/rules.mk

PKG_NAME:=quickstart
# `apk version` only accepts `-r<N>` as a numeric suffix, so the upstream
# `-rc<date>` marker becomes `_rc<date>`: 0.17.1-rc20261028-r7 is rejected,
# 0.17.1_rc20261028-r7 is accepted. PKG_RELEASE mirrors upstream's -r7.
PKG_VERSION:=0.17.1_rc20261028
PKG_RELEASE:=7

PKG_SOURCE:=quickstart-binary-0.17.1-rc20261028.tar.gz
PKG_SOURCE_URL:=https://github.com/istoreos/quickstart/releases/download/v0.17.1-rc20261028/
PKG_HASH:=c2fa6bfe8bc9f7a17f989f43f3103a2cd02314800dcf155989e2ff8f944c8469

# OpenWrt unpacks tarballs into "$(PKG_BUILD_DIR)/.." without stripping the
# archive's top directory, so the build directory name has to match it.
PKG_BUILD_DIR:=$(BUILD_DIR)/quickstart-binary-0.17.1-rc20261028

PKG_BUILD_PARALLEL:=1
PKG_LICENSE:=MIT

include $(INCLUDE_DIR)/package.mk

define Package/quickstart
  SECTION:=net
  CATEGORY:=Network
  TITLE:=Quickstart dashboard and first-boot guide
  URL:=https://github.com/istoreos/quickstart
  DEPENDS:=@(x86_64||aarch64||arm) +block-mount +mount-utils +lsblk +e2fsprogs +parted +ip-full +ubus +uci +bash
endef

define Package/quickstart/description
  Quickstart is the first-boot dashboard (network guide, storage layout, RAID)
  shipped by iStoreOS. This package installs the official prebuilt binary.
endef

define Package/quickstart/conffiles
/etc/config/quickstart
endef

define Build/Configure
endef

define Build/Compile
endef

define Package/quickstart/install
	$(INSTALL_DIR) $(1)/usr/sbin
	$(INSTALL_BIN) $(PKG_BUILD_DIR)/quickstart.$(ARCH) $(1)/usr/sbin/quickstart
	$(INSTALL_DIR) $(1)/etc/init.d
	$(INSTALL_BIN) ./files/quickstart.init $(1)/etc/init.d/quickstart
	$(INSTALL_DIR) $(1)/etc/config
	$(INSTALL_CONF) ./files/quickstart.config $(1)/etc/config/quickstart
	$(INSTALL_DIR) $(1)/etc/uci-defaults
	$(INSTALL_BIN) ./files/quickstart.uci-default $(1)/etc/uci-defaults/09-quickstart
	$(INSTALL_DIR) $(1)/www/luci-static/quickstart
	$(CP) $(PKG_BUILD_DIR)/web/luci-static/quickstart/. $(1)/www/luci-static/quickstart/
endef

$(eval $(call BuildPackage,quickstart))
