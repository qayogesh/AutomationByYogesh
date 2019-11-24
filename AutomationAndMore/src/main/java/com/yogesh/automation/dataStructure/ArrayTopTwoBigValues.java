package com.yogesh.automation.dataStructure;

public class ArrayTopTwoBigValues {

	public static void main(String[] args) {
		// TODO Auto-generated method stub
		ArrayTopTwoBigValues obj = new ArrayTopTwoBigValues();
		int[] arr = { 4, 6, 3, 88, 99, 3535 };
		obj.topTwoBigValues(arr);
	}

	public void topTwoBigValues(int[] arr) {
		int max1 = Integer.MIN_VALUE;
		int max2 = Integer.MIN_VALUE;
		int len = arr.length;

		for (int i = 0; i < len; i++) {
			if (arr[i] > max1) {
				max2 = max1;
				max1 = arr[i];
			}else if(arr[i] > max2) {
				max2 = arr[i];
			}
		}
		System.out.print("top two are " + max1 + " and " + max2);
	}

}
